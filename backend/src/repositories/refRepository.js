import { pool } from "./db.js";

// Справочники: режимы, языки, сложности. Меняются только миграцией,
// поэтому кэшируются в памяти после первого чтения.
let cache = null;

export async function getAll(db = pool) {
  if (cache) return cache;
  const [modes, languages, difficulties] = await Promise.all([
    db.query("SELECT id, code, name, in_leaderboard FROM modes ORDER BY id"),
    db.query("SELECT id, code, name FROM languages ORDER BY id"),
    db.query("SELECT id, code, name FROM difficulties ORDER BY id"),
  ]);
  cache = { modes: modes.rows, languages: languages.rows, difficulties: difficulties.rows };
  return cache;
}

// Переводит коды ('classic', 'en', 'medium') в id. Неизвестный код → null.
export async function resolve({ mode, language, difficulty }) {
  const refs = await getAll();
  return {
    mode: refs.modes.find((m) => m.code === mode) || null,
    language: refs.languages.find((l) => l.code === language) || null,
    difficulty: refs.difficulties.find((d) => d.code === difficulty) || null,
  };
}
