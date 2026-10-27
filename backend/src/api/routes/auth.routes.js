import { Router } from "express";
import * as authService from "../../services/authService.js";
import { handle } from "../handler.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register { login, password } → { user, token }
router.post("/register", handle(async (req, res) => {
  res.status(201).json(await authService.register(req.body || {}));
}));

// POST /api/auth/login { login, password } → { user, token }
router.post("/login", handle(async (req, res) => {
  res.json(await authService.login(req.body || {}));
}));

// POST /api/auth/logout
router.post("/logout", handle(async (req, res) => {
  await authService.logout(req.token);
  res.status(204).end();
}));

// GET /api/auth/me → текущий пользователь
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: authService.publicUser(req.user) });
});

export default router;
