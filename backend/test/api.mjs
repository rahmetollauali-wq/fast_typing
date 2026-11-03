// API-тесты по тест-кейсам из раздела 10 ТЗ. Нужен запущенный backend.
// Запуск: docker compose exec backend npm run test:api
import assert from "node:assert/strict";

const API = process.env.API_URL || "http://localhost:3000/api";
let passed = 0;
let failed = 0;

async function call(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
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

// Журнал нажатий: каждый символ через `step` мс; `wrong` — позиции с ошибкой.
function keystrokes(text, { step = 150, wrong = [] } = {}) {
  return [...text].map((ch, i) => ({ t: i * step, k: wrong.includes(i) ? "#" : ch }));
}

const login = `tester_${Date.now().toString(36)}`;
const password = "secret123";
let token;

console.log(`API: ${API}\n`);

await check("Сервер и база доступны", async () => {
  const r = await call("GET", "/health");
  assert.equal(r.data.db, "connected");
});

await check("TC-01 Регистрация с паролем из 6 символов → ошибка, аккаунт не создан", async () => {
  const r = await call("POST", "/auth/register", { login, password: "123456" });
  assert.equal(r.status, 400);
  assert.equal(r.data.error.code, "PASSWORD_TOO_SHORT");
  const again = await call("POST", "/auth/login", { login, password: "123456" });
  assert.equal(again.status, 401);
});

await check("FR-01 Регистрация с правильным паролем", async () => {
  const r = await call("POST", "/auth/register", { login, password });
  assert.equal(r.status, 201);
  assert.ok(r.data.token);
  token = r.data.token;
});

await check("TC-02 Вход с неверным паролем → «Неверный логин или пароль»", async () => {
  const r = await call("POST", "/auth/login", { login, password: "wrong-password" });
  assert.equal(r.status, 401);
  assert.equal(r.data.error.code, "INVALID_CREDENTIALS");
  assert.equal(r.data.error.message, "Неверный логин или пароль");
});

await check("FR-02 Вход и выход", async () => {
  const r = await call("POST", "/auth/login", { login, password });
  assert.equal(r.status, 200);
  const t = r.data.token;
  assert.equal((await call("GET", "/auth/me", null, t)).status, 200);
  await call("POST", "/auth/logout", null, t);
  assert.equal((await call("GET", "/auth/me", null, t)).status, 401);
});

await check("FR-05 Случайный текст по режиму, языку и сложности (все режимы)", async () => {
  for (const [mode, option] of [["classic"], ["quotes"], ["noerror"], ["words", 25], ["time", 30]]) {
    for (const language of ["ru", "en"]) {
      for (const difficulty of ["easy", "medium", "hard"]) {
        const q = new URLSearchParams({ mode, language, difficulty, ...(option ? { option } : {}) });
        const r = await call("GET", `/texts/random?${q}`);
        assert.equal(r.status, 200, `${mode}/${language}/${difficulty}: ${JSON.stringify(r.data)}`);
        assert.ok(r.data.text.length > 0);
        if (mode === "words") assert.equal(r.data.text.split(" ").length, 25);
      }
    }
  }
});

const getText = async (mode, extra = {}) =>
  (await call("GET", `/texts/random?${new URLSearchParams({ mode, language: "en", difficulty: "easy", ...extra })}`)).data;

const submit = (text, ks, extra = {}, t = token) =>
  call("POST", "/attempts", { mode: text.mode, language: "en", difficulty: "easy", option: text.option, textId: text.textId, textIds: text.textIds, target: text.text, keystrokes: ks, ...extra }, t);

await check("TC-04 10 символов, 2 с ошибкой → точность 80%", async () => {
  const text = { mode: "custom", text: "abcdefghij abcdefghij" };
  const ks = keystrokes(text.text, { wrong: [2, 6] }).slice(0, 10);
  const r = await call("POST", "/attempts", { mode: "custom", language: "en", difficulty: "easy", target: text.text, keystrokes: [...ks, ...keystrokes(text.text.slice(10)).map((k) => ({ ...k, t: k.t + 1500 }))] }, null);
  // первые 10 нажатий: 8 верных, 2 ошибки; затем ещё 11 верных → 19 из 21
  assert.equal(r.data.errors, 2);
  assert.equal(r.data.accuracy, Math.round((19 / 21) * 10000) / 100);
});

await check("TC-05 300 символов верно за 60 с → WPM 60, точность 100%, QS 60", async () => {
  const target = ("typing " .repeat(43)).trim().slice(0, 300);
  const ks = [...target].map((k, i) => ({ t: Math.round((i * 60000) / 299), k }));
  const r = await call("POST", "/attempts", { mode: "custom", language: "en", difficulty: "easy", target, keystrokes: ks }, null);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.wpm, 60);
  assert.equal(r.data.accuracy, 100);
  assert.equal(r.data.qualityScore, 60);
});

let firstQs;
await check("FR-11 Завершённая попытка сохраняется", async () => {
  const text = await getText("classic");
  const r = await submit(text, keystrokes(text.text, { step: 400 }));
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.saved, true);
  assert.equal(r.data.isRecord, true);
  firstQs = r.data.qualityScore;
});

await check("TC-06 Прерванный тест (Esc) не появляется в истории", async () => {
  const before = (await call("GET", "/attempts", null, token)).data.total;
  const text = await getText("classic");
  // Esc не отправляет попытку; даже если клиент пришлёт незаконченный текст — сервер не сохранит
  const r = await submit(text, keystrokes(text.text.slice(0, 15)));
  assert.equal(r.status, 400);
  assert.equal(r.data.error.code, "NOT_FINISHED");
  const after = (await call("GET", "/attempts", null, token)).data.total;
  assert.equal(after, before);
});

await check("TC-07 QS выше рекорда → рекорд обновлён (isRecord)", async () => {
  const text = await getText("classic");
  const r = await submit(text, keystrokes(text.text, { step: 150 }));
  assert.ok(r.data.qualityScore > firstQs);
  assert.equal(r.data.isRecord, true);
  assert.equal(r.data.previousBest, firstQs);
  const profile = await call("GET", "/profile", null, token);
  const rec = profile.data.records.find((x) => x.mode === "classic" && x.language === "en" && x.difficulty === "easy");
  assert.equal(rec.quality_score, r.data.qualityScore);
});

await check("FR-12 QS не выше рекорда → рекорд не меняется", async () => {
  const text = await getText("classic");
  const r = await submit(text, keystrokes(text.text, { step: 600 }));
  assert.equal(r.data.isRecord, false);
});

await check("TC-08 Свой текст из 10 символов → «Минимум 20 символов»", async () => {
  const r = await call("POST", "/attempts", { mode: "custom", language: "en", difficulty: "easy", target: "abcdefghij", keystrokes: keystrokes("abcdefghij") }, token);
  assert.equal(r.status, 400);
  assert.equal(r.data.error.code, "CUSTOM_TOO_SHORT");
  assert.equal(r.data.error.message, "Минимум 20 символов");
});

await check("UC-03 5б Гость получает результат, но попытка не сохраняется", async () => {
  const text = await getText("classic");
  const r = await submit(text, keystrokes(text.text), {}, null);
  assert.equal(r.status, 200);
  assert.equal(r.data.saved, false);
  assert.ok(r.data.wpm > 0);
});

await check("Режим «На время»: длительность = выбранному времени", async () => {
  const text = await getText("time", { option: 15 });
  const ks = keystrokes(text.text.slice(0, 60), { step: 240 });
  const r = await submit(text, ks);
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.durationMs, 15000);
});

await check("Режим «Без ошибок»: попытка завершается на первой ошибке", async () => {
  const text = await getText("noerror");
  const r = await submit(text, keystrokes(text.text.slice(0, 12), { wrong: [11] }));
  assert.equal(r.status, 201, JSON.stringify(r.data));
  assert.equal(r.data.stoppedByError, true);
});

await check("Подделанный текст отклоняется", async () => {
  const text = await getText("classic");
  const r = await submit({ ...text, text: "fake text that was never issued" }, keystrokes("fake text that was never issued"));
  assert.equal(r.data.error.code, "TEXT_MISMATCH");
});

await check("Нереальная скорость (> 250 WPM) отклоняется", async () => {
  const text = await getText("classic");
  const r = await submit(text, keystrokes(text.text, { step: 5 }));
  assert.equal(r.status, 422);
});

await check("FR-13 История: новые сверху, по 20 на страницу", async () => {
  const r = await call("GET", "/attempts", null, token);
  assert.equal(r.data.pageSize, 20);
  assert.ok(r.data.total >= 4);
  const dates = r.data.rows.map((x) => new Date(x.created_at).getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));
});

await check("FR-14 Таблица лидеров: топ-50 и своё место", async () => {
  const r = await call("GET", "/leaderboard?mode=classic&language=en&difficulty=easy&period=all", null, token);
  assert.equal(r.status, 200);
  assert.ok(r.data.me, "нет своей строки");
  assert.ok(r.data.rows.length <= 50);
});

await check("FR-16 Обычный пользователь не может управлять текстами", async () => {
  const r = await call("GET", "/admin/texts", null, token);
  assert.equal(r.status, 403);
});

console.log(`\nПройдено: ${passed}, не пройдено: ${failed}`);
process.exit(failed ? 1 : 0);
