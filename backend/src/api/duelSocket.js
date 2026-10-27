// WebSocket для дуэлей: /api/duels/ws?token=<токен входа>
//
// Клиент → сервер                      Сервер → клиент
//   { type: "join", code }               { type: "room", room }       — состояние комнаты
//   { type: "progress", typed, wpm }     { type: "progress", playerId, progress }
//   { type: "finish", keystrokes }       { type: "rematch", code }    — перейти в новую комнату
//   { type: "rematch" }                  { type: "error", code, message }
//   { type: "leave" }
import { WebSocketServer } from "ws";
import * as authService from "../services/authService.js";
import * as duelService from "../services/duelService.js";

const PATH = "/api/duels/ws";
const sockets = new Map(); // код комнаты → Set(ws)

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(code, msg) {
  const set = sockets.get(code);
  if (!set) return;
  const data = JSON.stringify(msg);
  for (const ws of set) if (ws.readyState === ws.OPEN) ws.send(data);
}

function detach(ws, { explicit = false } = {}) {
  const code = ws.roomCode;
  if (!code) return;
  ws.roomCode = null;
  const set = sockets.get(code);
  set?.delete(ws);
  if (set && set.size === 0) sockets.delete(code);
  // если у игрока осталась другая открытая вкладка в этой комнате — он не вышел
  const stillHere = [...(set || [])].some((other) => other.user.id === ws.user.id);
  if (!stillHere || explicit) duelService.leave(code, ws.user.id, { explicit });
}

async function onMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch {
    return send(ws, { type: "error", code: "BAD_JSON", message: "Некорректное сообщение" });
  }
  try {
    switch (msg.type) {
      case "join": {
        const code = duelService.normalizeCode(msg.code);
        if (ws.roomCode && ws.roomCode !== code) detach(ws);
        ws.roomCode = code;
        if (!sockets.has(code)) sockets.set(code, new Set());
        sockets.get(code).add(ws);
        try {
          duelService.join(code, ws.user);
        } catch (err) {
          detach(ws);
          throw err;
        }
        break;
      }
      case "progress":
        if (ws.roomCode) duelService.progress(ws.roomCode, ws.user.id, msg);
        break;
      case "finish":
        if (ws.roomCode) await duelService.finish(ws.roomCode, ws.user, msg.keystrokes);
        break;
      case "rematch":
        if (ws.roomCode) await duelService.rematch(ws.roomCode, ws.user);
        break;
      case "leave":
        detach(ws, { explicit: true });
        break;
      default:
        send(ws, { type: "error", code: "UNKNOWN_TYPE", message: "Неизвестный тип сообщения" });
    }
  } catch (err) {
    send(ws, { type: "error", code: err.code || "SERVER_ERROR", message: err.message });
    if (!err.status) console.error(err);
  }
}

export function attachDuelSocket(server) {
  duelService.setNotifier(broadcast);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

  server.on("upgrade", async (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== PATH) return socket.destroy();
    const user = await authService.userByToken(url.searchParams.get("token")).catch(() => null);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      return socket.destroy();
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      ws.user = user;
      ws.isAlive = true;
      ws.on("pong", () => { ws.isAlive = true; });
      ws.on("message", (data) => onMessage(ws, data.toString()));
      ws.on("close", () => detach(ws));
      send(ws, { type: "hello", user: authService.publicUser(user) });
    });
  });

  // Пинг каждые 25 секунд: «мёртвые» соединения закрываются, игрок считается вышедшим.
  const timer = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.isAlive) {
        ws.terminate();
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 25000);
  timer.unref();
  return wss;
}
