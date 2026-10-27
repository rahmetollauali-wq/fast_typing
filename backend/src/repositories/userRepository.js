import { pool } from "./db.js";

export async function findByLogin(login, db = pool) {
  const { rows } = await db.query("SELECT * FROM users WHERE lower(login) = lower($1)", [login]);
  return rows[0] || null;
}

export async function findById(id, db = pool) {
  const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function create({ login, passwordHash, role = "user" }, db = pool) {
  const { rows } = await db.query(
    "INSERT INTO users (login, password_hash, role) VALUES ($1, $2, $3) RETURNING *",
    [login, passwordHash, role]
  );
  return rows[0];
}
