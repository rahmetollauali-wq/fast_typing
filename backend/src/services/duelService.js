// Дуэли: комната на двоих с временным кодом.
//
//   waiting   → хозяин создал комнату и ждёт соперника (код живёт 10 минут)
//   countdown → оба в комнате, отсчёт 3 секунды
//   running   → оба печатают один и тот же текст, прогресс виден сопернику
//   finished  → оба закончили (или вышло время) — показан победитель
//   cancelled → хозяин закрыл комнату или код истёк
//
// Комнаты живут в памяти сервера, итог дуэли сохраняется в таблицу duels.
// Результат каждого игрока считает attemptService — по тем же правилам,
// что и в обычном тесте, и попытка попадает в историю и рекорды.
import crypto from "node:crypto";
import * as attemptService from "./attemptService.js";
import * as textService from "./textService.js";
import * as duels from "../repositories/duelRepository.js";
import { badRequest, notFound, AppError } from "./errors.js";

export const DUEL_MODES = ["classic", "words", "quotes", "time"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без 0/O и 1/I
const CODE_LENGTH = 6;
const WAITING_TTL_MS = 10 * 60 * 1000;
const FINISHED_TTL_MS = 10 * 60 * 1000;
const COUNTDOWN_MS = 3000;
const MAX_RACE_MS = 5 * 60 * 1000;
const TIME_MODE_GRACE_MS = 30 * 1000; // время «на раскачку» до первого нажатия

const rooms = new Map();
let notify = () => {};

// Слой API регистрирует функцию, которая рассылает сообщения подключённым игрокам.
export function setNotifier(fn) {
  notify = fn;
}

function newCode() {
  for (;;) {
    let code = "";
    const bytes = crypto.randomBytes(CODE_LENGTH);
    for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
    if (!rooms.has(code)) return code;
  }
}

export const normalizeCode = (code) => String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

function summary(r) {
  if (!r) return null;
  return {
    attemptId: r.attemptId ?? null,
    wpm: r.wpm,
    rawWpm: r.rawWpm,
    accuracy: r.accuracy,
    qualityScore: r.qualityScore,
    errors: r.errors,
    correctKeys: r.correctKeys,
    totalKeys: r.totalKeys,
    durationMs: r.durationMs,
    pace: r.pace,
    isRecord: r.isRecord,
    stoppedByError: r.stoppedByError,
  };
}

// То, что видят игроки. Текст отдаётся только после старта — подсмотреть заранее нельзя.
export function publicRoom(room) {
  return {
    now: Date.now(), // время сервера — клиент по нему поправляет свои часы для отсчёта
    code: room.code,
    status: room.status,
    settings: room.settings,
    hostId: room.hostId,
    expiresAt: room.expiresAt,
    startsAt: room.startsAt,
    startedAt: room.startedAt,
    deadlineAt: room.deadlineAt,
    text: room.status === "running" || room.status === "finished" ? room.text : null,
    winnerId: room.winnerId,
    rematchCode: room.rematchCode,
    players: [...room.players.values()].map((p) => ({
      id: p.id,
      login: p.login,
      connected: p.connected,
      progress: p.progress,
      finished: p.finished,
      dnf: p.dnf,
      dnfReason: p.dnfReason,
      finishedAt: p.finishedAt,
      result: summary(p.result),
    })),
  };
}

const push = (room) => notify(room.code, { type: "room", room: publicRoom(room) });

function getRoomOrThrow(code) {
  const room = rooms.get(normalizeCode(code));
  if (!room) throw notFound("Комната не найдена или код истёк");
  return room;
}

export function getRoom(code) {
  return publicRoom(getRoomOrThrow(code));
}

function clearTimers(room) {
  clearTimeout(room.countdownTimer);
  clearTimeout(room.deadlineTimer);
  room.countdownTimer = null;
  room.deadlineTimer = null;
}

function cancel(room, reason) {
  clearTimers(room);
  room.status = "cancelled";
  room.cancelReason = reason;
  push(room);
  rooms.delete(room.code);
}

// Хозяин создаёт комнату. Старая ожидающая комната этого же хозяина закрывается.
export async function createRoom(user, body = {}) {
  const settings = {
    mode: String(body.mode || "classic"),
    language: String(body.language || "en"),
    difficulty: String(body.difficulty || "medium"),
    option: null,
  };
  if (!DUEL_MODES.includes(settings.mode)) {
    throw badRequest("INVALID_MODE", `Режимы дуэли: ${DUEL_MODES.join(", ")}`);
  }
  if (settings.mode === "time" || settings.mode === "words") settings.option = Number(body.option);

  const text = await textService.getTextForTest({ ...settings });

  for (const r of rooms.values()) {
    if (r.hostId === user.id && r.status === "waiting") cancel(r, "replaced");
  }

  const code = newCode();
  const room = {
    code,
    settings,
    text,
    hostId: user.id,
    status: "waiting",
    createdAt: new Date(),
    expiresAt: Date.now() + WAITING_TTL_MS,
    startsAt: null,
    startedAt: null,
    deadlineAt: null,
    winnerId: null,
    rematchCode: null,
    players: new Map(),
  };
  rooms.set(code, room);
  return publicRoom(room);
}

function startCountdown(room) {
  room.status = "countdown";
  room.startsAt = Date.now() + COUNTDOWN_MS;
  room.countdownTimer = setTimeout(() => startRace(room), COUNTDOWN_MS);
  push(room);
}

function startRace(room) {
  room.status = "running";
  room.startedAt = Date.now();
  const limit = room.settings.mode === "time" ? room.settings.option * 1000 + TIME_MODE_GRACE_MS : MAX_RACE_MS;
  room.deadlineAt = room.startedAt + limit;
  room.deadlineTimer = setTimeout(() => {
    for (const p of room.players.values()) {
      if (!p.finished) Object.assign(p, { finished: true, dnf: true, dnfReason: "TIMEOUT" });
    }
    finalize(room);
  }, limit);
  push(room);
}

// Игрок входит в комнату по коду. Повторный вход того же игрока — переподключение.
export function join(code, user) {
  const room = getRoomOrThrow(code);
  const existing = room.players.get(user.id);

  if (existing) {
    existing.connected = true;
  } else {
    if (room.status !== "waiting") throw new AppError(409, "ROOM_STARTED", "Дуэль уже началась");
    if (room.players.size >= 2) throw new AppError(409, "ROOM_FULL", "В комнате уже два игрока");
    room.players.set(user.id, {
      id: user.id,
      login: user.login,
      connected: true,
      progress: { typed: 0, errors: 0, wpm: 0 },
      finished: false,
      dnf: false,
      dnfReason: null,
      finishedAt: null,
      result: null,
    });
  }

  const players = [...room.players.values()];
  if (room.status === "waiting" && players.length === 2 && players.every((p) => p.connected)) {
    startCountdown(room);
  } else {
    push(room);
  }
  return publicRoom(room);
}

// Соединение закрылось (вкладку закрыли или перезагрузили) или игрок нажал «выйти».
export function leave(code, userId, { explicit = false } = {}) {
  const room = rooms.get(normalizeCode(code));
  if (!room) return;
  const player = room.players.get(userId);
  if (!player) return;
  player.connected = false;

  if (room.status === "waiting" || room.status === "countdown") {
    if (room.status === "countdown") {
      clearTimers(room);
      room.status = "waiting";
      room.startsAt = null;
    }
    if (userId === room.hostId && explicit) return cancel(room, "host_left");
    if (userId !== room.hostId) room.players.delete(userId); // место освобождается для другого
    return push(room);
  }

  if (room.status === "running") {
    if (explicit && !player.finished) {
      Object.assign(player, { finished: true, dnf: true, dnfReason: "LEFT" });
    }
    const players = [...room.players.values()];
    if (players.every((p) => p.finished || !p.connected)) {
      for (const p of players) if (!p.finished) Object.assign(p, { finished: true, dnf: true, dnfReason: "LEFT" });
      return finalize(room);
    }
    return push(room);
  }
}

// Прогресс во время гонки — только для полос прогресса, на итог не влияет.
export function progress(code, userId, data = {}) {
  const room = rooms.get(normalizeCode(code));
  if (!room || room.status !== "running") return;
  const player = room.players.get(userId);
  if (!player || player.finished) return;
  const clamp = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
  player.progress = {
    typed: clamp(data.typed, room.text.text.length),
    errors: clamp(data.errors, 100000),
    wpm: clamp(data.wpm, 400),
  };
  notify(room.code, { type: "progress", playerId: userId, progress: player.progress });
}

// Игрок закончил: сервер пересчитывает результат по журналу нажатий.
export async function finish(code, user, keystrokes) {
  const room = rooms.get(normalizeCode(code));
  if (!room || room.status !== "running") return;
  const player = room.players.get(user.id);
  if (!player || player.finished) return;
  player.finished = true; // сразу, чтобы второй «finish» не посчитался дважды
  player.finishedAt = Date.now();

  try {
    const { textId, text } = room.text;
    player.result = await attemptService.submit(user, {
      ...room.settings,
      textId,
      target: text,
      keystrokes,
    });
    player.progress = { ...player.progress, typed: player.result.typed.length, wpm: Math.round(player.result.wpm) };
  } catch (err) {
    player.dnf = true;
    player.dnfReason = err.code || "ERROR";
  }

  if ([...room.players.values()].every((p) => p.finished)) await finalize(room);
  else push(room);
}

// Победитель — у кого выше Quality Score; при равенстве — кто закончил раньше.
export function pickWinner(players) {
  const valid = players.filter((p) => !p.dnf && p.result);
  if (!valid.length) return null;
  valid.sort((a, b) => b.result.qualityScore - a.result.qualityScore || a.finishedAt - b.finishedAt);
  if (valid.length > 1 && valid[0].result.qualityScore === valid[1].result.qualityScore && valid[0].finishedAt === valid[1].finishedAt) {
    return null;
  }
  return valid[0].id;
}

async function finalize(room) {
  if (room.status === "finished") return;
  clearTimers(room);
  room.status = "finished";
  const players = [...room.players.values()];
  room.winnerId = pickWinner(players);
  room.finishedAt = Date.now();
  push(room);

  const host = room.players.get(room.hostId);
  const guest = players.find((p) => p.id !== room.hostId);
  // Дуэль, которую никто не допечатал, в историю не попадает.
  const anyResult = players.some((p) => p.result && !p.dnf);
  if (host && guest && anyResult) {
    try {
      const refs = await textService.resolveRefs(room.settings);
      await duels.create({
        code: room.code,
        modeId: refs.mode.id,
        languageId: refs.language.id,
        difficultyId: refs.difficulty.id,
        modeOption: room.settings.option,
        hostId: host.id,
        guestId: guest.id,
        hostAttemptId: host.result?.attemptId,
        guestAttemptId: guest.result?.attemptId,
        winnerId: room.winnerId,
        createdAt: room.createdAt,
      });
    } catch (err) {
      console.error("Не удалось сохранить дуэль:", err.message);
    }
  }
}

// Реванш: новая комната с теми же настройками, оба игрока получают новый код.
export async function rematch(code, user) {
  const room = getRoomOrThrow(code);
  if (room.status !== "finished") throw badRequest("NOT_FINISHED", "Дуэль ещё не закончилась");
  if (!room.players.has(user.id)) throw new AppError(403, "FORBIDDEN", "Вы не участник этой дуэли");
  if (!room.rematchCode || !rooms.has(room.rematchCode)) {
    const next = await createRoom(user, room.settings);
    room.rematchCode = next.code;
  }
  notify(room.code, { type: "rematch", code: room.rematchCode });
  push(room);
  return room.rematchCode;
}

// История дуэлей с точки зрения пользователя: «я» и «соперник».
export async function history(user) {
  const [stats, rows] = await Promise.all([duels.statsByUser(user.id), duels.listByUser(user.id, 20)]);
  return {
    stats,
    rows: rows.map((r) => {
      const meHost = r.host_id === user.id;
      return {
        id: r.id,
        code: r.code,
        finishedAt: r.finished_at,
        mode: r.mode,
        option: r.mode_option,
        language: r.language,
        difficulty: r.difficulty,
        opponent: meHost ? r.guest_login : r.host_login,
        me: { wpm: meHost ? r.host_wpm : r.guest_wpm, accuracy: meHost ? r.host_accuracy : r.guest_accuracy, qualityScore: meHost ? r.host_qs : r.guest_qs },
        them: { wpm: meHost ? r.guest_wpm : r.host_wpm, accuracy: meHost ? r.guest_accuracy : r.host_accuracy, qualityScore: meHost ? r.guest_qs : r.host_qs },
        outcome: r.winner_id === null ? "draw" : r.winner_id === user.id ? "win" : "loss",
      };
    }),
  };
}

// Уборка: просроченные ожидающие комнаты и старые завершённые.
function sweep() {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status === "waiting" && now > room.expiresAt) cancel(room, "expired");
    else if (room.status === "finished" && now - room.finishedAt > FINISHED_TTL_MS) rooms.delete(room.code);
  }
}
setInterval(sweep, 30 * 1000).unref();

// Для тестов
export const _rooms = rooms;
