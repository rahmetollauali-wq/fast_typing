import pg from "pg";

// NUMERIC из PostgreSQL приходит строкой — превращаем в число.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));

// Пул подключений к PostgreSQL. Адрес задаётся в docker-compose.yml.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Выполняет fn внутри транзакции. fn получает клиента, которого
// нужно передавать в функции репозиториев вместо пула.
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
