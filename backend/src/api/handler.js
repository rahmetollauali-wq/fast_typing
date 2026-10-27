import { AppError } from "../services/errors.js";

// Оборачивает async-контроллер, чтобы ошибки попадали в errorHandler.
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Маршрут не найден" } });
}

// Единый формат ошибок: { error: { code, message, details? } }
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "BAD_JSON", message: "Некорректный JSON" } });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: { code: "TOO_LARGE", message: "Слишком большой запрос" } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Ошибка сервера" } });
}
