// Ошибка приложения: код для frontend (он переводит его на нужный язык),
// HTTP-статус и сообщение по-русски для логов и отладки.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (code = "UNAUTHORIZED", message = "Нужно войти в систему") =>
  new AppError(401, code, message);
export const forbidden = (message = "Недостаточно прав") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "Не найдено") => new AppError(404, "NOT_FOUND", message);
