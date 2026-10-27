import { pool } from "./db.js";

// Текущий рекорд с блокировкой строки до конца транзакции (защита от гонки,
// если пользователь завершил два теста одновременно).
export async function findForUpdate({ userId, modeId, languageId, difficultyId }, db = pool) {
  const { rows } = await db.query(
    `SELECT * FROM personal_records
     WHERE user_id = $1 AND mode_id = $2 AND language_id = $3 AND difficulty_id = $4
     FOR UPDATE`,
    [userId, modeId, languageId, difficultyId]
  );
  return rows[0] || null;
}

export async function upsert({ userId, modeId, languageId, difficultyId, attemptId, qualityScore }, db = pool) {
  await db.query(
    `INSERT INTO personal_records (user_id, mode_id, language_id, difficulty_id, attempt_id, quality_score)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, mode_id, language_id, difficulty_id)
     DO UPDATE SET attempt_id = EXCLUDED.attempt_id, quality_score = EXCLUDED.quality_score`,
    [userId, modeId, languageId, difficultyId, attemptId, qualityScore]
  );
}

export async function listByUser(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT pr.quality_score, a.wpm, a.accuracy, a.created_at,
            m.code AS mode, l.code AS language, d.code AS difficulty
     FROM personal_records pr
     JOIN attempts a ON a.id = pr.attempt_id
     JOIN modes m ON m.id = pr.mode_id
     JOIN languages l ON l.id = pr.language_id
     JOIN difficulties d ON d.id = pr.difficulty_id
     WHERE pr.user_id = $1
     ORDER BY pr.quality_score DESC`,
    [userId]
  );
  return rows;
}

// Рекорды всех пользователей для таблицы лидеров «за всё время».
export async function listForBoard({ modeId, languageId, difficultyId }, db = pool) {
  const { rows } = await db.query(
    `SELECT pr.user_id, u.login, a.wpm, a.raw_wpm, a.accuracy, pr.quality_score, a.created_at
     FROM personal_records pr
     JOIN attempts a ON a.id = pr.attempt_id
     JOIN users u ON u.id = pr.user_id
     WHERE pr.mode_id = $1 AND pr.language_id = $2 AND pr.difficulty_id = $3
       AND NOT u.is_blocked`,
    [modeId, languageId, difficultyId]
  );
  return rows;
}
