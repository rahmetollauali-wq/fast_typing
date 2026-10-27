// API-клиент: запросы к backend в формате REST + JSON.
import { storage } from "../lib/storage.js";

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(method, path, body) {
  const token = storage.get("token");
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "NETWORK", "Network error");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error?.code || "SERVER_ERROR", data?.error?.message || res.statusText);
  }
  return data;
}

const qs = (params) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
};

export const api = {
  meta: () => request("GET", "/meta"),

  register: (login, password) => request("POST", "/auth/register", { login, password }),
  login: (login, password) => request("POST", "/auth/login", { login, password }),
  logout: () => request("POST", "/auth/logout"),
  me: () => request("GET", "/auth/me"),

  randomText: (params) => request("GET", `/texts/random${qs(params)}`),
  submitAttempt: (payload) => request("POST", "/attempts", payload),
  history: (params) => request("GET", `/attempts${qs(params)}`),
  profile: () => request("GET", "/profile"),
  leaderboard: (params) => request("GET", `/leaderboard${qs(params)}`),

  adminTexts: (params) => request("GET", `/admin/texts${qs(params)}`),
  adminCreateText: (payload) => request("POST", "/admin/texts", payload),
  adminDeleteText: (id) => request("DELETE", `/admin/texts/${id}`),
  adminRestoreText: (id) => request("POST", `/admin/texts/${id}/restore`),

  createDuel: (settings) => request("POST", "/duels", settings),
  getDuel: (code) => request("GET", `/duels/${encodeURIComponent(code)}`),
  duelHistory: () => request("GET", "/duels/history"),
};
