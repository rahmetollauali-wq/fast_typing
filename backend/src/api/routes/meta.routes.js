import { Router } from "express";
import * as refs from "../../repositories/refRepository.js";
import { pool } from "../../repositories/db.js";
import { TIME_OPTIONS, WORD_OPTIONS, CUSTOM_MIN, CUSTOM_MAX } from "../../services/textService.js";
import { handle } from "../handler.js";

const router = Router();

// GET /api/health — сервер жив и видит базу
router.get("/health", handle(async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", db: "disconnected", message: err.message });
  }
}));

// GET /api/meta — справочники и настройки режимов для frontend
router.get("/meta", handle(async (req, res) => {
  const all = await refs.getAll();
  res.json({
    ...all,
    options: { time: TIME_OPTIONS, words: WORD_OPTIONS },
    custom: { min: CUSTOM_MIN, max: CUSTOM_MAX },
  });
}));

export default router;
