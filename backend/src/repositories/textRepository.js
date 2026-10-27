import { pool } from "./db.js";

// Случайный активный текст по режиму, языку и сложности.
export async function findRandom({ modeId, languageId, difficultyId, excludeId }, db = pool) {
  const { rows } = await db.query(
    `SELECT id, body, author FROM texts
     WHERE mode_id = $1 AND language_id = $2 AND difficulty_id = $3 AND is_active
       AND ($4::int IS NULL OR id <> $4)
     ORDER BY random() LIMIT 1`,
    [modeId, languageId, difficultyId, excludeId ?? null]
  );
  // Если исключённый текст был единственным — отдаём его же.
  if (!rows[0] && excludeId) return findRandom({ modeId, languageId, difficultyId }, db);
  return rows[0] || null;
}

export async function findById(id, db = pool) {
  const { rows } = await db.query("SELECT * FROM texts WHERE id = $1", [id]);
  return rows[0] || null;
}

// Все слова словарей для языка и сложности (режимы «Слова» и «На время»).
export async function findDictionary({ modeId, languageId, difficultyId }, db = pool) {
  const { rows } = await db.query(
    "SELECT body FROM texts WHERE mode_id = $1 AND language_id = $2 AND difficulty_id = $3 AND is_active",
    [modeId, languageId, difficultyId]
  );
  return rows.flatMap((r) => r.body.split(/\s+/).filter(Boolean));
}

export async function list({ modeId, languageId, difficultyId }, db = pool) {
  const { rows } = await db.query(
    `SELECT t.id, t.body, t.author, t.is_active,
            m.code AS mode, l.code AS language, d.code AS difficulty
     FROM texts t
     JOIN modes m ON m.id = t.mode_id
     JOIN languages l ON l.id = t.language_id
     JOIN difficulties d ON d.id = t.difficulty_id
     WHERE ($1::int IS NULL OR t.mode_id = $1)
       AND ($2::int IS NULL OR t.language_id = $2)
       AND ($3::int IS NULL OR t.difficulty_id = $3)
     ORDER BY t.is_active DESC, t.id DESC`,
    [modeId ?? null, languageId ?? null, difficultyId ?? null]
  );
  return rows;
}

export async function create({ modeId, languageId, difficultyId, body, author }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO texts (mode_id, language_id, difficulty_id, body, author)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [modeId, languageId, difficultyId, body, author || null]
  );
  return rows[0];
}

export async function isUsedInAttempts(id, db = pool) {
  const { rows } = await db.query("SELECT 1 FROM attempts WHERE text_id = $1 LIMIT 1", [id]);
  return rows.length > 0;
}

export async function remove(id, db = pool) {
  await db.query("DELETE FROM texts WHERE id = $1", [id]);
}

export async function setActive(id, isActive, db = pool) {
  await db.query("UPDATE texts SET is_active = $2 WHERE id = $1", [id, isActive]);
}
