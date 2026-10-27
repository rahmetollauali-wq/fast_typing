import * as authService from "../../services/authService.js";
import { unauthorized, forbidden } from "../../services/errors.js";

export function tokenFrom(req) {
  const header = req.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

// Если передан действующий токен — кладёт пользователя в req.user.
// Без токена запрос проходит как от гостя.
export async function optionalAuth(req, res, next) {
  try {
    req.token = tokenFrom(req);
    req.user = await authService.userByToken(req.token);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") return next(forbidden());
  next();
}
