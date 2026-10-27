import { pool } from "./db.js";

export async function create(d, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO duels (code, mode_id, language_id, difficulty_id, mode_option,
                        host_id, guest_id, host_attempt_id, guest_attempt_id, winner_id, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [d.code, d.modeId, d.languageId, d.difficultyId, d.modeOption ?? null,
      d.hostId, d.guestId, d.hostAttemptId ?? null, d.guestAttemptId ?? null, d.winnerId ?? null, d.createdAt]
  );
  return rows[0];
}

// Последние дуэли пользователя с результатами обоих игроков.
export async function listByUser(userId, limit = 20, db = pool) {
  const { rows } = await db.query(
    `SELECT d.id, d.code, d.finished_at, d.mode_option, d.winner_id,
            m.code AS mode, l.code AS language, df.code AS difficulty,
            d.host_id, h.login AS host_login, d.guest_id, g.login AS guest_login,
            ha.wpm AS host_wpm, ha.accuracy AS host_accuracy, ha.quality_score AS host_qs,
            ga.wpm AS guest_wpm, ga.accuracy AS guest_accuracy, ga.quality_score AS guest_qs
     FROM duels d
     JOIN users h ON h.id = d.host_id
     JOIN users g ON g.id = d.guest_id
     JOIN modes m ON m.id = d.mode_id
     JOIN languages l ON l.id = d.language_id
     JOIN difficulties df ON df.id = d.difficulty_id
     LEFT JOIN attempts ha ON ha.id = d.host_attempt_id
     LEFT JOIN attempts ga ON ga.id = d.guest_attempt_id
     WHERE d.host_id = $1 OR d.guest_id = $1
     ORDER BY d.finished_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function statsByUser(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE winner_id = $1)::int AS wins,
            count(*) FILTER (WHERE winner_id IS NULL)::int AS draws
     FROM duels WHERE host_id = $1 OR guest_id = $1`,
    [userId]
  );
  const s = rows[0];
  return { ...s, losses: s.total - s.wins - s.draws };
}
