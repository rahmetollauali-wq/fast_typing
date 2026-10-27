import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import * as users from "../repositories/userRepository.js";
import * as sessions from "../repositories/sessionRepository.js";
import { badRequest, unauthorized, AppError } from "./errors.js";

const BCRYPT_ROUNDS = 10;
const SESSION_DAYS = 7;
const LOGIN_RE = /^[A-Za-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const publicUser = (u) => ({ id: u.id, login: u.login, role: u.role });

async function issueToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await sessions.create({ userId, tokenHash: hashToken(token), expiresAt });
  return token;
}

// FR-01: регистрация по логину и паролю (пароль не короче 8 символов).
export async function register({ login, password }) {
  login = String(login || "").trim();
  password = String(password || "");
  if (!LOGIN_RE.test(login)) {
    throw badRequest("INVALID_LOGIN", "Логин: 3–20 символов, латиница, цифры и _");
  }
  if (password.length < MIN_PASSWORD) {
    throw badRequest("PASSWORD_TOO_SHORT", `Пароль должен быть не короче ${MIN_PASSWORD} символов`);
  }
  if (await users.findByLogin(login)) {
    throw new AppError(409, "LOGIN_TAKEN", "Логин занят");
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS); // NFR-02
  let user;
  try {
    user = await users.create({ login, passwordHash });
  } catch (err) {
    if (err.code === "23505") throw new AppError(409, "LOGIN_TAKEN", "Логин занят");
    throw err;
  }
  return { user: publicUser(user), token: await issueToken(user.id) };
}

// FR-02: вход.
export async function login({ login, password }) {
  const user = await users.findByLogin(String(login || "").trim());
  const ok = user && (await bcrypt.compare(String(password || ""), user.password_hash));
  if (!ok) throw unauthorized("INVALID_CREDENTIALS", "Неверный логин или пароль");
  if (user.is_blocked) throw new AppError(403, "USER_BLOCKED", "Учётная запись заблокирована");
  return { user: publicUser(user), token: await issueToken(user.id) };
}

// FR-02: выход — токен аннулируется.
export async function logout(token) {
  if (token) await sessions.deleteByTokenHash(hashToken(token));
}

export async function userByToken(token) {
  if (!token) return null;
  const user = await sessions.findUserByTokenHash(hashToken(token));
  if (!user || user.is_blocked) return null;
  return user;
}

// Создаёт администратора из переменных окружения, если его ещё нет.
export async function ensureAdmin(login, password) {
  if (!login || !password) return false;
  if (await users.findByLogin(login)) return false;
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await users.create({ login, passwordHash, role: "admin" });
  return true;
}

export async function cleanupSessions() {
  await sessions.deleteExpired();
}
