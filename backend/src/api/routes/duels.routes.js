import { Router } from "express";
import * as duelService from "../../services/duelService.js";
import { handle } from "../handler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// POST /api/duels { mode, option, language, difficulty } → комната с временным кодом
router.post("/", handle(async (req, res) => {
  res.status(201).json(await duelService.createRoom(req.user, req.body || {}));
}));

// GET /api/duels/history → { stats: { total, wins, losses, draws }, rows }
router.get("/history", handle(async (req, res) => {
  res.json(await duelService.history(req.user));
}));

// GET /api/duels/:code → состояние комнаты (проверить код перед входом)
router.get("/:code", handle(async (req, res) => {
  res.json(duelService.getRoom(req.params.code));
}));

export default router;
