import { pool } from "./db.js";

// Миграции, которые выполняются при каждом старте backend.
// IF NOT EXISTS — поэтому повторный запуск ничего не ломает, а уже
// существующую базу не нужно пересоздавать (docker compose down -v не нужен).
const MIGRATIONS = [
  {
    name: "001_duels",
    sql: `
      CREATE TABLE IF NOT EXISTS duels (
          id                SERIAL PRIMARY KEY,
          code              VARCHAR(8)  NOT NULL,
          mode_id           INT         NOT NULL REFERENCES modes(id),
          language_id       INT         NOT NULL REFERENCES languages(id),
          difficulty_id     INT         NOT NULL REFERENCES difficulties(id),
          mode_option       INT,
          host_id           INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          guest_id          INT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          host_attempt_id   INT         REFERENCES attempts(id) ON DELETE SET NULL,
          guest_attempt_id  INT         REFERENCES attempts(id) ON DELETE SET NULL,
          winner_id         INT         REFERENCES users(id) ON DELETE SET NULL,
          created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
          finished_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_duels_host  ON duels (host_id, finished_at DESC);
      CREATE INDEX IF NOT EXISTS idx_duels_guest ON duels (guest_id, finished_at DESC);
    `,
  },
];

export async function runMigrations() {
  for (const m of MIGRATIONS) {
    await pool.query(m.sql);
  }
}
