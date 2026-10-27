import express from "express";
import { optionalAuth } from "./api/middleware/auth.js";
import { errorHandler, notFoundHandler } from "./api/handler.js";
import metaRoutes from "./api/routes/meta.routes.js";
import authRoutes from "./api/routes/auth.routes.js";
import textsRoutes from "./api/routes/texts.routes.js";
import attemptsRoutes from "./api/routes/attempts.routes.js";
import leaderboardRoutes from "./api/routes/leaderboard.routes.js";
import profileRoutes from "./api/routes/profile.routes.js";
import adminRoutes from "./api/routes/admin.routes.js";
import duelsRoutes from "./api/routes/duels.routes.js";

// Слой API: маршруты → сервисы (бизнес-логика) → репозитории (SQL).
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(optionalAuth);

  app.use("/api", metaRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/texts", textsRoutes);
  app.use("/api/attempts", attemptsRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/duels", duelsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
