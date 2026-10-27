import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { storage } from "../lib/storage.js";

// Адрес WebSocket — тот же хост, что и у страницы (Vite проксирует /api на backend).
// Поэтому работает и на localhost, и по IP в локальной сети.
function socketUrl() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const token = encodeURIComponent(storage.get("token") || "");
  return `${proto}://${window.location.host}/api/duels/ws?token=${token}`;
}

const MAX_RETRIES = 6;

// Подключение к комнате дуэли: состояние комнаты, ошибки, отправка сообщений.
export function useDuelSocket(code) {
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("connecting"); // connecting | open | reconnecting | closed
  const [clockOffset, setClockOffset] = useState(0); // серверное время − время браузера
  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const roomRef = useRef(null);
  roomRef.current = room;

  useEffect(() => {
    let disposed = false;
    let retryTimer = null;
    setRoom(null);
    setError(null);
    setStatus("connecting");
    retriesRef.current = 0;

    const open = () => {
      const ws = new WebSocket(socketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        retriesRef.current = 0;
        setStatus("open");
        ws.send(JSON.stringify({ type: "join", code }));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "room") {
          if (Number.isFinite(msg.room.now)) setClockOffset(msg.room.now - Date.now());
          setRoom(msg.room);
        } else if (msg.type === "progress") {
          setRoom((r) => r && {
            ...r,
            players: r.players.map((p) => (p.id === msg.playerId ? { ...p, progress: msg.progress } : p)),
          });
        } else if (msg.type === "rematch") {
          navigate(`/duel/${msg.code}`);
        } else if (msg.type === "error") {
          setError({ code: msg.code, message: msg.message });
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        const finished = ["finished", "cancelled"].includes(roomRef.current?.status);
        if (finished || retriesRef.current >= MAX_RETRIES) {
          setStatus("closed");
          return;
        }
        retriesRef.current += 1;
        setStatus("reconnecting");
        retryTimer = setTimeout(open, Math.min(1000 * retriesRef.current, 4000));
      };
    };

    open();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      wsRef.current?.close();
    };
  }, [code, navigate]);

  const send = useCallback((msg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { room, error, status, send, clockOffset };
}
