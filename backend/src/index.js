import { createApp } from "./app.js";
import { pool } from "./repositories/db.js";
import * as authService from "./services/authService.js";
import { runMigrations } from "./repositories/migrations.js";
import { attachDuelSocket } from "./api/duelSocket.js";

const port = Number(process.env.PORT) || 3000;

// Ждём, пока база примет подключения (на первом запуске она создаёт таблицы).
async function waitForDb(retries = 30) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1 FROM modes LIMIT 1");
      return;
    } catch (err) {
      console.log(`База ещё не готова (${i}/${retries}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Не удалось подключиться к базе данных");
}

async function main() {
  await waitForDb();
  if (await authService.ensureAdmin(process.env.ADMIN_LOGIN, process.env.ADMIN_PASSWORD)) {
    console.log(`Создан администратор: ${process.env.ADMIN_LOGIN}`);
  }
  await runMigrations();
  await authService.cleanupSessions();
  const server = createApp().listen(port, () => console.log(`Backend запущен на порту ${port}`));
  attachDuelSocket(server); // дуэли в реальном времени: /api/duels/ws
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
