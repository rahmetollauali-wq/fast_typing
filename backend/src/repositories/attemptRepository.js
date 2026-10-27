import { pool } from "./db.js";

export async function create(a, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO attempts
       (user_id, mode_id, language_id, difficulty_id, mode_option, text_id, custom_text,
        wpm, raw_wpm, accuracy, errors, duration_ms, quality_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id, created_at`,
    [
      a.userId, a.modeId, a.languageId, a.difficultyId, a.modeOption ?? null,
      a.textId ?? null, a.customText ?? null,
      a.wpm, a.rawWpm, a.accuracy, a.errors, a.durationMs, a.qualityScore,
    ]
  );
  return rows[0];
}

const HISTORY_SELECT = `
  SELECT a.id, a.wpm, a.raw_wpm, a.accuracy, a.errors, a.duration_ms, a.quality_score,
         a.mode_option, a.created_at,
         m.code AS mode, l.code AS language, d.code AS difficulty
  FROM attempts a
  JOIN modes m ON m.id = a.mode_id
  JOIN languages l ON l.id = a.language_id
  JOIN difficulties d ON d.id = a.difficulty_id`;

// История попыток пользователя, новые сверху.
export async function listByUser({ userId, modeId, limit, offset }, db = pool) {
  const where = "WHERE a.user_id = $1 AND ($2::int IS NULL OR a.mode_id = $2)";
  const [list, count] = await Promise.all([
    db.query(`${HISTORY_SELECT} ${where} ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`,
      [userId, modeId ?? null, limit, offset]),
    db.query(`SELECT count(*)::int AS total FROM attempts a ${where}`, [userId, modeId ?? null]),
  ]);
  return { rows: list.rows, total: count.rows[0].total };
}

// Последние N попыток (для графика прогресса), старые слева.
export async function recentByUser(userId, limit, db = pool) {
  const { rows } = await db.query(
    `SELECT wpm, accuracy, quality_score, created_at FROM attempts
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.reverse();
}

export async function statsByUser(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS attempts,
            coalesce(max(wpm), 0) AS best_wpm,
            coalesce(round(avg(wpm), 1), 0) AS avg_wpm,
            coalesce(round(avg(accuracy), 1), 0) AS avg_accuracy,
            coalesce(sum(duration_ms), 0)::bigint AS total_ms
     FROM attempts WHERE user_id = $1`,
    [userId]
  );
  return { ...rows[0], total_ms: Number(rows[0].total_ms) };
}

// Лучшая попытка каждого пользователя с даты `since` (для «сегодня» и «неделя»).
export async function bestPerUserSince({ modeId, languageId, difficultyId, since }, db = pool) {
  const { rows } = await db.query(
    `SELECT DISTINCT ON (a.user_id)
            a.user_id, u.login, a.wpm, a.raw_wpm, a.accuracy, a.quality_score, a.created_at
     FROM attempts a JOIN users u ON u.id = a.user_id
     WHERE a.mode_id = $1 AND a.language_id = $2 AND a.difficulty_id = $3
       AND a.created_at >= $4 AND NOT u.is_blocked
     ORDER BY a.user_id, a.quality_score DESC, a.created_at ASC`,
    [modeId, languageId, difficultyId, since]
  );
  return rows;
}
