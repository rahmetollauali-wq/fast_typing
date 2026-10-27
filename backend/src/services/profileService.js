import * as attempts from "../repositories/attemptRepository.js";
import * as records from "../repositories/recordRepository.js";
import * as refs from "../repositories/refRepository.js";
import { publicUser } from "./authService.js";
import { badRequest } from "./errors.js";

export const HISTORY_PAGE_SIZE = 20;

// UC-04: сводка, рекорды по режимам и прогресс за последние 30 попыток.
export async function getProfile(user) {
  const [stats, recordList, progress] = await Promise.all([
    attempts.statsByUser(user.id),
    records.listByUser(user.id),
    attempts.recentByUser(user.id, 30),
  ]);
  return { user: publicUser(user), stats, records: recordList, progress };
}

// FR-13: история попыток, новые сверху, по 20 на страницу, фильтр по режиму.
export async function getHistory(user, { mode, page = 1 }) {
  let modeId = null;
  if (mode) {
    const m = (await refs.getAll()).modes.find((x) => x.code === mode);
    if (!m) throw badRequest("INVALID_MODE", "Неизвестный режим");
    modeId = m.id;
  }
  const current = Math.max(Number(page) || 1, 1);
  const { rows, total } = await attempts.listByUser({
    userId: user.id,
    modeId,
    limit: HISTORY_PAGE_SIZE,
    offset: (current - 1) * HISTORY_PAGE_SIZE,
  });
  return {
    rows,
    total,
    page: current,
    pages: Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE)),
    pageSize: HISTORY_PAGE_SIZE,
  };
}
