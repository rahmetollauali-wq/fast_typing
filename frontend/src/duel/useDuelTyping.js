import { useCallback, useEffect, useRef, useState } from "react";
import { liveMetrics } from "../lib/metrics.js";

const isFormField = (el) => el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
const PROGRESS_EVERY_MS = 200;

// Набор текста в дуэли. Правила те же, что на экране теста: таймер с первой клавиши,
// курсор идёт только вперёд, Backspace не возвращает в законченное слово.
// onProgress — для полос прогресса соперника, onFinish(keystrokes) — итог на сервер.
export function useDuelTyping({ text, enabled, onProgress, onFinish }) {
  const [typed, setTyped] = useState("");
  const [errorPositions, setErrorPositions] = useState([]);
  const [phase, setPhase] = useState("ready"); // ready | running | done
  const [, setTick] = useState(0);
  const run = useRef({ typed: [], keystrokes: [], start: 0, correctKeys: 0, totalKeys: 0, errors: new Set(), lastSent: 0 });
  const phaseRef = useRef(phase);
  const timerRef = useRef(null);
  phaseRef.current = phase;

  // Новый текст (новая дуэль) — всё с нуля.
  useEffect(() => {
    clearInterval(timerRef.current);
    run.current = { typed: [], keystrokes: [], start: 0, correctKeys: 0, totalKeys: 0, errors: new Set(), lastSent: 0 };
    setTyped("");
    setErrorPositions([]);
    setPhase("ready");
  }, [text?.text]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Дуэль закончилась раньше (вышло время, соперник вышел) — останавливаем таймер.
  useEffect(() => {
    if (!enabled) clearInterval(timerRef.current);
  }, [enabled]);

  const metrics = useCallback(() => {
    const r = run.current;
    const elapsedMs = r.start ? performance.now() - r.start : 0;
    return liveMetrics({ typed: r.typed.join(""), target: text.text, correctKeys: r.correctKeys, totalKeys: r.totalKeys, elapsedMs });
  }, [text]);

  const finish = useCallback(() => {
    if (phaseRef.current === "done") return;
    clearInterval(timerRef.current);
    phaseRef.current = "done";
    setPhase("done");
    const m = metrics();
    onProgress?.({ typed: run.current.typed.length, errors: m.errors, wpm: m.wpm });
    onFinish(run.current.keystrokes);
  }, [metrics, onFinish, onProgress]);

  const sendProgress = useCallback((force = false) => {
    const r = run.current;
    const now = performance.now();
    if (!force && now - r.lastSent < PROGRESS_EVERY_MS) return;
    r.lastSent = now;
    const m = metrics();
    onProgress?.({ typed: r.typed.length, errors: m.errors, wpm: m.wpm });
  }, [metrics, onProgress]);

  const onKey = useCallback((e) => {
    if (!enabled || !text || isFormField(document.activeElement) || e.ctrlKey || e.metaKey) return;
    const p = phaseRef.current;
    if (p === "done") return;
    const r = run.current;
    const target = text.text;

    if (e.key === "Tab" || e.key === "Escape") {
      e.preventDefault(); // в дуэли нельзя начать заново
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      const last = r.typed.length - 1;
      if (last < 0 || p !== "running") return;
      if (r.typed[last] === " " && target[last] === " ") return;
      r.typed.pop();
      r.keystrokes.push({ t: Math.round(performance.now() - r.start), k: "Backspace" });
      setTyped(r.typed.join(""));
      sendProgress();
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();

    if (p === "ready") {
      r.start = performance.now();
      phaseRef.current = "running";
      setPhase("running");
      timerRef.current = setInterval(() => {
        setTick((n) => n + 1);
        sendProgress();
        if (text.mode === "time" && performance.now() - r.start >= text.option * 1000) finish();
      }, 100);
    }
    const pos = r.typed.length;
    if (pos >= target.length) return;
    const ok = e.key === target[pos];
    r.typed.push(e.key);
    r.keystrokes.push({ t: Math.round(performance.now() - r.start), k: e.key });
    r.totalKeys += 1;
    if (ok) r.correctKeys += 1;
    else {
      r.errors.add(pos);
      setErrorPositions([...r.errors]);
    }
    setTyped(r.typed.join(""));
    if (r.typed.length === target.length) finish();
    else sendProgress();
  }, [enabled, text, finish, sendProgress]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const r = run.current;
  const elapsed = r.start && phase === "running" ? performance.now() - r.start : 0;
  const live = text ? metrics() : null;
  const remaining = text?.mode === "time" ? Math.max(0, Math.ceil((text.option * 1000 - elapsed) / 1000)) : null;

  return { typed, errorPositions, phase, live, elapsed, remaining };
}
