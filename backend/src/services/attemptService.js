import { transaction } from "../repositories/db.js";
import * as attempts from "../repositories/attemptRepository.js";
import * as records from "../repositories/recordRepository.js";
import * as textService from "./textService.js";
import { replay, calculate, paceSeries, errorSummary } from "./metrics.js";
import { badRequest, AppError } from "./errors.js";

const MAX_KEYSTROKES = 20000;
const MAX_WPM = 250;          // выше — почти наверняка подделка
const TIME_TOLERANCE_MS = 1500;

function parseKeystrokes(list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw badRequest("EMPTY_ATTEMPT", "Журнал нажатий пуст");
  }
  if (list.length > MAX_KEYSTROKES) throw badRequest("TOO_MANY_KEYSTROKES", "Слишком длинный журнал");
  const t0 = Number(list[0]?.t) || 0;
  let prev = 0;
  return list.map((ks) => {
    const t = Number(ks?.t) - t0;
    if (!Number.isFinite(t) || t < prev) throw badRequest("BAD_KEYSTROKES", "Журнал нажатий повреждён");
    prev = t;
    return { t, k: String(ks.k) };
  });
}

// UC-03, шаг 5: сервер пересчитывает результат по журналу нажатий,
// считает QS, сохраняет попытку и обновляет рекорд (FR-10 – FR-12).
// Гость получает результат, но попытка не сохраняется (альтернатива 5б).
export async function submit(user, body) {
  const mode = String(body.mode || "");
  const refs = await textService.resolveRefs({ mode, language: body.language, difficulty: body.difficulty });
  const option = mode === "time" || mode === "words" ? Number(body.option) : null;
  textService.checkOption(mode, option);

  const target = textService.normalize(body.target);
  const textId = await textService.verifyTarget({
    mode,
    languageId: refs.language.id,
    difficultyId: refs.difficulty.id,
    option,
    textId: body.textId,
    textIds: body.textIds,
    target,
  });

  const keystrokes = parseKeystrokes(body.keystrokes);
  const result = replay(target, keystrokes, { stopOnError: mode === "noerror" });
  const lastT = keystrokes[keystrokes.length - 1].t;

  let durationMs;
  if (mode === "time") {
    const limit = option * 1000;
    if (lastT > limit + TIME_TOLERANCE_MS) throw badRequest("BAD_KEYSTROKES", "Нажатия после конца времени");
    durationMs = result.finished ? Math.min(limit, Math.max(lastT, 1)) : limit;
  } else {
    const done = result.finished || (mode === "noerror" && result.stoppedByError);
    if (!done) throw badRequest("NOT_FINISHED", "Тест не завершён");
    durationMs = Math.max(lastT, 1);
  }

  const metrics = calculate({
    correctChars: result.correctChars,
    typedChars: result.typed.length,
    correctKeys: result.correctKeys,
    totalKeys: result.totalKeys,
    durationMs,
  });
  if (metrics.wpm > MAX_WPM) throw new AppError(422, "SUSPICIOUS_RESULT", "Результат выглядит недостоверным");

  const response = {
    mode,
    language: refs.language.code,
    difficulty: refs.difficulty.code,
    option,
    textId,
    target,
    typed: result.typed,
    durationMs,
    ...metrics,
    errors: result.errors,
    correctKeys: result.correctKeys,
    totalKeys: result.totalKeys,
    stoppedByError: result.stoppedByError,
    errorPositions: result.errorPositions,
    pace: paceSeries(result.correctTimes, result.errorTimes, durationMs),
    note: errorSummary(target, result.errorPositions),
    saved: false,
    isRecord: false,
    previousBest: null,
  };

  if (!user) return response;

  const saved = await transaction(async (db) => {
    const attempt = await attempts.create({
      userId: user.id,
      modeId: refs.mode.id,
      languageId: refs.language.id,
      difficultyId: refs.difficulty.id,
      modeOption: option,
      textId,
      customText: mode === "custom" ? target : null,
      wpm: metrics.wpm,
      rawWpm: metrics.rawWpm,
      accuracy: metrics.accuracy,
      errors: result.errors,
      durationMs,
      qualityScore: metrics.qualityScore,
    }, db);

    const key = { userId: user.id, modeId: refs.mode.id, languageId: refs.language.id, difficultyId: refs.difficulty.id };
    const current = await records.findForUpdate(key, db);
    // Рекорд обновляется, только если новый QS строго больше (раздел 7.1).
    const isRecord = !current || metrics.qualityScore > current.quality_score;
    if (isRecord) {
      await records.upsert({ ...key, attemptId: attempt.id, qualityScore: metrics.qualityScore }, db);
    }
    return { attemptId: attempt.id, createdAt: attempt.created_at, isRecord, previousBest: current?.quality_score ?? null };
  });

  return { ...response, ...saved, saved: true };
}
