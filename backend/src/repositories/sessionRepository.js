import { pool } from "./db.js";

export async function create({ userId, tokenHash, expiresAt }, db = pool) {
  await db.query(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt]
  );
}

// Возвращает пользователя по действующему токену.
export async function findUserByTokenHash(tokenHash, db = pool) {
  const { rows } = await db.query(
    `SELECT u.* FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

export async function deleteByTokenHash(tokenHash, db = pool) {
  await db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
}

export async function deleteExpired(db = pool) {
  await db.query("DELETE FROM sessions WHERE expires_at <= now()");
}
