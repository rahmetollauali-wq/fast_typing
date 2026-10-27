import { Router } from "express";
import * as attemptService from "../../services/attemptService.js";
import * as profileService from "../../services/profileService.js";
import { handle } from "../handler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/attempts — итог теста и журнал нажатий.
// С токеном попытка сохраняется, без токена (гость) — только считается.
router.post("/", handle(async (req, res) => {
  const result = await attemptService.submit(req.user, req.body || {});
  res.status(result.saved ? 201 : 200).json(result);
}));

// GET /api/attempts?mode=classic&page=1 — история текущего пользователя
router.get("/", requireAuth, handle(async (req, res) => {
  res.json(await profileService.getHistory(req.user, { mode: req.query.mode, page: req.query.page }));
}));

export default router;
