import * as records from "../repositories/recordRepository.js";
import * as attempts from "../repositories/attemptRepository.js";
import * as textService from "./textService.js";
import { badRequest } from "./errors.js";

export const TOP_LIMIT = 50;
const PERIODS = { today: 24 * 3600 * 1000, week: 7 * 24 * 3600 * 1000, all: null };

const toRow = (r, rank, userId) => ({
  rank,
  login: r.login,
  wpm: r.wpm,
  rawWpm: r.raw_wpm,
  accuracy: r.accuracy,
  qualityScore: r.quality_score,
  recordedAt: r.created_at,
  isMe: r.user_id === userId,
});

// FR-14: таблица лидеров — лучший результат каждого пользователя,
// по убыванию Quality Score; при равенстве выше тот, кто успел раньше.
export async function getBoard({ mode = "classic", language = "en", difficulty = "medium", period = "all", page = 1, pageSize = 10, userId = null }) {
  const refs = await textService.resolveRefs({ mode, language, difficulty });
  if (!refs.mode.in_leaderboard) throw badRequest("INVALID_MODE", "Этот режим не участвует в рейтинге");
  if (!(period in PERIODS)) throw badRequest("INVALID_PERIOD", "Период: today, week или all");

  const key = { modeId: refs.mode.id, languageId: refs.language.id, difficultyId: refs.difficulty.id };
  const rows = PERIODS[period] === null
    ? await records.listForBoard(key)
    : await attempts.bestPerUserSince({ ...key, since: new Date(Date.now() - PERIODS[period]) });

  rows.sort((a, b) => b.quality_score - a.quality_score || new Date(a.created_at) - new Date(b.created_at));
  const ranked = rows.map((r, i) => toRow(r, i + 1, userId));

  const top = ranked.slice(0, TOP_LIMIT);
  const size = Math.min(Math.max(Number(pageSize) || 10, 1), TOP_LIMIT);
  const pages = Math.max(1, Math.ceil(top.length / size));
  const current = Math.min(Math.max(Number(page) || 1, 1), pages);

  return {
    mode: refs.mode.code,
    language: refs.language.code,
    difficulty: refs.difficulty.code,
    period,
    total: ranked.length,
    page: current,
    pages,
    pageSize: size,
    rows: top.slice((current - 1) * size, current * size),
    me: ranked.find((r) => r.isMe) || null,
  };
}
