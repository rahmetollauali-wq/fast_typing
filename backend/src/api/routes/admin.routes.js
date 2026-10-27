import { Router } from "express";
import * as adminService from "../../services/adminService.js";
import { handle } from "../handler.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAdmin);

// GET /api/admin/texts?mode=classic&language=ru&difficulty=easy
router.get("/texts", handle(async (req, res) => {
  const { mode, language, difficulty } = req.query;
  res.json(await adminService.listTexts({ mode, language, difficulty }));
}));

// POST /api/admin/texts { mode, language, difficulty, body, author }
router.post("/texts", handle(async (req, res) => {
  res.status(201).json(await adminService.createText(req.body || {}));
}));

// DELETE /api/admin/texts/:id
router.delete("/texts/:id", handle(async (req, res) => {
  res.json(await adminService.deleteText(req.params.id));
}));

// POST /api/admin/texts/:id/restore — вернуть скрытый текст
router.post("/texts/:id/restore", handle(async (req, res) => {
  res.json(await adminService.restoreText(req.params.id));
}));

export default router;
