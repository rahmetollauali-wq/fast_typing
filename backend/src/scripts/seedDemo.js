// Демо-данные для таблицы лидеров: 40 пользователей с попытками за последние 10 дней.
// Запуск: docker compose exec backend npm run seed:demo
// Пароль у всех демо-пользователей: demo12345
import bcrypt from "bcryptjs";
import { pool, transaction } from "../repositories/db.js";
import * as users from "../repositories/userRepository.js";
import * as attempts from "../repositories/attemptRepository.js";
import * as records from "../repositories/recordRepository.js";
import * as refs from "../repositories/refRepository.js";
import { calculate } from "../services/metrics.js";

const NAMES = [
  "nightshift", "softsignal", "afterhours", "lowfrequency", "stillwater", "quietkeys", "slowburn",
  "nordlight", "papercut", "midnight_owl", "steppe_wind", "almaty_dev", "orbit", "lighthouse",
  "keystone", "aster", "fernway", "glasswing", "northstar", "riverbend", "saltair", "tundra",
  "ember", "cobalt", "lumen", "drift", "harbor", "meadow", "prism", "sable", "tidal", "velvet",
  "willow", "zenith", "atlas", "birch", "canyon", "dune", "echo", "fable",
];

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function main() {
  const all = await refs.getAll();
  const modes = all.modes.filter((m) => m.code !== "custom");
  const hash = await bcrypt.hash("demo12345", 10);
  const { rows: texts } = await pool.query("SELECT id, mode_id, language_id, difficulty_id FROM texts WHERE is_active");
  const { rows: modeRows } = await pool.query("SELECT id, code FROM modes");
  const modeId = Object.fromEntries(modeRows.map((m) => [m.code, m.id]));
  let created = 0;

  for (const login of NAMES) {
    if (await users.findByLogin(login)) continue;
    const user = await users.create({ login, passwordHash: hash });
    created++;
    const skill = rand(35, 150);

    for (let i = 0; i < 12; i++) {
      const mode = i < 6 ? modes.find((m) => m.code === "classic") : pick(modes);
      const language = i < 6 ? all.languages.find((l) => l.code === "en") : pick(all.languages);
      const difficulty = i < 6 ? all.difficulties.find((d) => d.code === "medium") : pick(all.difficulties);
      const source = mode.code === "noerror" ? modeId.classic : mode.code === "quotes" ? modeId.quotes : mode.code === "classic" ? modeId.classic : null;
      const text = source ? texts.find((t) => t.mode_id === source && t.language_id === language.id && t.difficulty_id === difficulty.id) : null;
      const option = mode.code === "time" ? pick([15, 30, 60, 120]) : mode.code === "words" ? pick([10, 25, 50]) : null;

      const durationMs = Math.round(option && mode.code === "time" ? option * 1000 : rand(15000, 60000));
      const accuracy = rand(88, 100);
      const wpmTarget = Math.max(15, skill + rand(-12, 8));
      const correctChars = Math.round((wpmTarget * 5 * durationMs) / 60000);
      const totalKeys = Math.round(correctChars / (accuracy / 100));
      const m = calculate({ correctChars, typedChars: totalKeys, correctKeys: correctChars, totalKeys, durationMs });
      const createdAt = new Date(Date.now() - rand(0, 10 * 24 * 3600 * 1000));

      await transaction(async (db) => {
        const a = await attempts.create({
          userId: user.id, modeId: mode.id, languageId: language.id, difficultyId: difficulty.id,
          modeOption: option, textId: text?.id ?? null, customText: null,
          wpm: m.wpm, rawWpm: m.rawWpm, accuracy: m.accuracy, errors: totalKeys - correctChars,
          durationMs, qualityScore: m.qualityScore,
        }, db);
        await db.query("UPDATE attempts SET created_at = $2 WHERE id = $1", [a.id, createdAt]);
        const key = { userId: user.id, modeId: mode.id, languageId: language.id, difficultyId: difficulty.id };
        const current = await records.findForUpdate(key, db);
        if (!current || m.qualityScore > current.quality_score) {
          await records.upsert({ ...key, attemptId: a.id, qualityScore: m.qualityScore }, db);
        }
      });
    }
  }
  console.log(`Готово: создано демо-пользователей — ${created}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
