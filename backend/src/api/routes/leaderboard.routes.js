import { Router } from "express";
import * as leaderboardService from "../../services/leaderboardService.js";
import { handle } from "../handler.js";

const router = Router();

// GET /api/leaderboard?mode=classic&language=en&difficulty=medium&period=all&page=1
router.get("/", handle(async (req, res) => {
  const { mode, language, difficulty, period, page, pageSize } = req.query;
  res.json(await leaderboardService.getBoard({
    mode, language, difficulty, period, page, pageSize, userId: req.user?.id ?? null,
  }));
}));

export default router;
