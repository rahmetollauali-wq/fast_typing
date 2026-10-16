import pg from "pg";

// Пул подключений к PostgreSQL. Адрес берётся из docker-compose.yml.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});
