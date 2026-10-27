import { Router } from "express";
import * as profileService from "../../services/profileService.js";
import { handle } from "../handler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/profile — сводка, рекорды, прогресс
router.get("/", requireAuth, handle(async (req, res) => {
  res.json(await profileService.getProfile(req.user));
}));

export default router;
