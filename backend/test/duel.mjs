// Тест дуэли через WebSocket: два игрока, один код, победитель — у кого выше QS.
// Нужен запущенный backend. Запуск: docker compose exec backend npm run test:duel
import assert from "node:assert/strict";
import WebSocket from "ws";

const API = process.env.API_URL || "http://localhost:3000/api";
const WS = API.replace(/^http/, "ws") + "/duels/ws";
let passed = 0;
let failed = 0;

async function call(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n    ${err.message}`);
  }
}

// Клиент: копит сообщения и умеет ждать нужное.
function connect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS}?token=${token}`);
    const inbox = [];
    const waiters = [];
    ws.on("message", (raw) => {
      const msg = JSON.parse(raw);
      inbox.push(msg);
      for (const w of [...waiters]) if (w.test(msg)) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
    });
    ws.on("error", reject);
    ws.on("unexpected-response", (req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    ws.on("open", () => resolve({
      ws,
      send: (m) => ws.send(JSON.stringify(m)),
      waitFor: (test, ms = 8000) => new Promise((res, rej) => {
        const found = inbox.find(test);
        if (found) { inbox.splice(inbox.indexOf(found), 1); return res(found); }
        const w = { test, resolve: res };
        waiters.push(w);
        setTimeout(() => rej(new Error("не дождались сообщения")), ms);
      }),
      close: () => ws.close(),
    }));
  });
}

const keystrokes = (text, step) => [...text].map((k, i) => ({ t: i * step, k }));
const roomIs = (status) => (m) => m.type === "room" && m.room.status === status;

async function user(prefix) {
  const login = `${prefix}_${Date.now().toString(36).slice(-5)}`;
  const r = await call("POST", "/auth/register", { login, password: "secret123" });
  return { login, token: r.data.token, id: r.data.user.id };
}

console.log(`WS: ${WS}\n`);
const alice = await user("alice");
const bob = await user("bob");
const carol = await user("carol");
let room;

await check("Без входа WebSocket отклоняется (401)", async () => {
  await assert.rejects(connect("bad-token"), /401/);
});

await check("Гость не может создать комнату", async () => {
  const r = await call("POST", "/duels", { mode: "classic", language: "en", difficulty: "easy" });
  assert.equal(r.status, 401);
});

await check("Создание комнаты → временный код из 6 символов", async () => {
  const r = await call("POST", "/duels", { mode: "classic", language: "en", difficulty: "easy" }, alice.token);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.match(r.data.code, /^[A-Z2-9]{6}$/);
  assert.equal(r.data.status, "waiting");
  assert.equal(r.data.text, null, "текст не должен быть виден до старта");
  room = r.data;
});

await check("Неверный код → ROOM_NOT_FOUND", async () => {
  const c = await connect(carol.token);
  c.send({ type: "join", code: "ZZZZZZ" });
  const e = await c.waitFor((m) => m.type === "error");
  assert.equal(e.code, "NOT_FOUND");
  c.close();
});

let a, b, text;
await check("Оба вошли по коду → отсчёт → старт с одинаковым текстом", async () => {
  a = await connect(alice.token);
  b = await connect(bob.token);
  a.send({ type: "join", code: room.code });
  await a.waitFor(roomIs("waiting"));
  b.send({ type: "join", code: room.code.toLowerCase() }); // регистр кода не важен
  const cd = await a.waitFor(roomIs("countdown"));
  assert.equal(cd.room.players.length, 2);
  const startA = await a.waitFor(roomIs("running"));
  const startB = await b.waitFor(roomIs("running"));
  text = startA.room.text;
  assert.ok(text.text.length > 20);
  assert.equal(startB.room.text.text, text.text);
});

await check("Третий игрок не может войти (ROOM_STARTED)", async () => {
  const c = await connect(carol.token);
  c.send({ type: "join", code: room.code });
  const e = await c.waitFor((m) => m.type === "error");
  assert.ok(["ROOM_STARTED", "ROOM_FULL"].includes(e.code), e.code);
  c.close();
});

await check("Прогресс игрока виден сопернику", async () => {
  a.send({ type: "progress", typed: 12, errors: 1, wpm: 55 });
  const p = await b.waitFor((m) => m.type === "progress");
  assert.equal(p.playerId, alice.id);
  assert.equal(p.progress.typed, 12);
});

await check("Оба закончили → победил тот, у кого выше QS", async () => {
  a.send({ type: "finish", keystrokes: keystrokes(text.text, 120) }); // быстрее
  const mid = await b.waitFor((m) => m.type === "room" && m.room.players.some((p) => p.finished));
  assert.equal(mid.room.status, "running", "ждём второго игрока");
  b.send({ type: "finish", keystrokes: keystrokes(text.text, 300) });
  const done = await a.waitFor(roomIs("finished"));
  assert.equal(done.room.winnerId, alice.id);
  const pa = done.room.players.find((p) => p.id === alice.id);
  const pb = done.room.players.find((p) => p.id === bob.id);
  assert.ok(pa.result.qualityScore > pb.result.qualityScore);
  assert.ok(pa.result.attemptId, "попытка сохранена в историю");
});

await check("Дуэль сохранена: у Алисы победа, у Боба поражение", async () => {
  await new Promise((r) => setTimeout(r, 300));
  const ha = await call("GET", "/duels/history", null, alice.token);
  const hb = await call("GET", "/duels/history", null, bob.token);
  assert.equal(ha.data.stats.wins, 1);
  assert.equal(ha.data.rows[0].outcome, "win");
  assert.equal(ha.data.rows[0].opponent, bob.login);
  assert.equal(hb.data.stats.losses, 1);
});

await check("Попытки из дуэли попали в обычную историю", async () => {
  const h = await call("GET", "/attempts", null, bob.token);
  assert.equal(h.data.total, 1);
});

await check("Реванш → оба получают новый код", async () => {
  b.send({ type: "rematch" });
  const ra = await a.waitFor((m) => m.type === "rematch");
  const rb = await b.waitFor((m) => m.type === "rematch");
  assert.equal(ra.code, rb.code);
  assert.notEqual(ra.code, room.code);
});

await check("Хозяин вышел из ожидающей комнаты → комната закрыта", async () => {
  const r = await call("POST", "/duels", { mode: "words", option: 10, language: "ru", difficulty: "easy" }, carol.token);
  const c = await connect(carol.token);
  c.send({ type: "join", code: r.data.code });
  await c.waitFor(roomIs("waiting"));
  c.send({ type: "leave" });
  await new Promise((res) => setTimeout(res, 200));
  const g = await call("GET", `/duels/${r.data.code}`, null, carol.token);
  assert.equal(g.status, 404);
  c.close();
});

await check("Игрок вышел посреди гонки → соперник побеждает", async () => {
  const r = await call("POST", "/duels", { mode: "classic", language: "en", difficulty: "medium" }, alice.token);
  const x = await connect(alice.token);
  const y = await connect(carol.token);
  x.send({ type: "join", code: r.data.code });
  y.send({ type: "join", code: r.data.code });
  const run = await x.waitFor(roomIs("running"));
  y.send({ type: "leave" });
  x.send({ type: "finish", keystrokes: keystrokes(run.room.text.text, 200) });
  const done = await x.waitFor(roomIs("finished"));
  assert.equal(done.room.winnerId, alice.id);
  assert.equal(done.room.players.find((p) => p.id === carol.id).dnfReason, "LEFT");
  x.close(); y.close();
});

a.close();
b.close();
console.log(`\nПройдено: ${passed}, не пройдено: ${failed}`);
process.exit(failed ? 1 : 0);
