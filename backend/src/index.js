import express from "express";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

// Проверка, что сервер жив и видит базу данных.
app.get("/api/health", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS tables FROM information_schema.tables WHERE table_schema = 'public'"
    );
    res.json({ status: "ok", db: "connected", tables: rows[0].tables });
  } catch (err) {
    res.status(500).json({ status: "error", db: "disconnected", message: err.message });
  }
});

// Список режимов из справочника — первый «настоящий» эндпоинт.
app.get("/api/modes", async (req, res) => {
  const { rows } = await pool.query("SELECT id, code, name FROM modes ORDER BY id");
  res.json(rows);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend запущен на порту ${port}`));
