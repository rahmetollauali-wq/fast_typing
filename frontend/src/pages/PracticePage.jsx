import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { TestSettings } from "../components/TestSettings.jsx";
import { WordsView } from "../components/WordsView.jsx";
import { Restart } from "../components/Icons.jsx";
import { CUSTOM_MAX, CUSTOM_MIN, useSettings } from "../context/SettingsContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { liveMetrics, normalizeText } from "../lib/metrics.js";
import { storage } from "../lib/storage.js";

const isFormField = (el) => el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);

// SCR-01 «Экран теста» — UC-03 «Пройти тест».
// Фазы: loading → ready → running → submitting → (экран результата)
export default function PracticePage() {
  const { t, errorText } = useI18n();
  const settings = useSettings();
  const { mode, option, language, difficulty } = settings;
  const navigate = useNavigate();
  const location = useLocation();

  const [text, setText] = useState(null);
  const [phase, setPhase] = useState("loading");
  const [typed, setTyped] = useState("");
  const [errorPositions, setErrorPositions] = useState([]);
  const [, setTick] = useState(0);
  const [error, setError] = useState("");
  const [customDraft, setCustomDraft] = useState(() => storage.get("custom-text", ""));

  // Всё, что меняется на каждое нажатие, хранится в ref — без лишних перерисовок.
  const run = useRef({ typed: [], keystrokes: [], start: 0, correctKeys: 0, totalKeys: 0, errors: new Set() });
  const phaseRef = useRef(phase);
  const textRef = useRef(text);
  const timerRef = useRef(null);
  const skipLoadRef = useRef(Boolean(location.state?.retryText));
  phaseRef.current = phase;
  textRef.current = text;

  const stopTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const resetRun = useCallback(() => {
    stopTimer();
    run.current = { typed: [], keystrokes: [], start: 0, correctKeys: 0, totalKeys: 0, errors: new Set() };
    setTyped("");
    setErrorPositions([]);
    setError("");
  }, []);

  // FR-05: случайный текст из БД по режиму, языку и сложности.
  const loadText = useCallback(async (excludeId) => {
    resetRun();
    if (mode === "custom") {
      setText(null);
      setPhase("custom");
      return;
    }
    setPhase("loading");
    try {
      const data = await api.randomText({ mode, language, difficulty, option, exclude: excludeId });
      setText(data);
      setPhase("ready");
    } catch (err) {
      setError(errorText(err));
      setPhase("error");
    }
  }, [mode, language, difficulty, option, resetRun, errorText]);

  // Смена настроек → новый текст. «Те же слова» с экрана результата → тот же текст.
  useEffect(() => {
    if (skipLoadRef.current) {
      skipLoadRef.current = false;
      resetRun();
      setText(location.state.retryText);
      setPhase("ready");
      navigate(".", { replace: true, state: null });
      return;
    }
    loadText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadText]);

  useEffect(() => stopTimer, []);

  const finish = useCallback(async () => {
    if (phaseRef.current === "submitting") return;
    stopTimer();
    setPhase("submitting");
    const current = textRef.current;
    try {
      const result = await api.submitAttempt({
        mode: current.mode,
        language: current.language,
        difficulty: current.difficulty,
        option: current.option,
        textId: current.textId,
        target: current.text,
        keystrokes: run.current.keystrokes,
      });
      navigate("/result", { state: { result, text: current } });
    } catch (err) {
      setError(errorText(err));
      setPhase("error");
    }
  }, [navigate, errorText]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTick((n) => n + 1);
      const current = textRef.current;
      if (current?.mode === "time" && performance.now() - run.current.start >= current.option * 1000) finish();
    }, 100);
  }, [finish]);

  // Обработка клавиатуры (FR-06 – FR-09).
  const onKey = useCallback((e) => {
    if (isFormField(document.activeElement) || e.ctrlKey || e.metaKey) return;
    const p = phaseRef.current;

    if (e.key === "Tab") {
      e.preventDefault();
      if (p === "custom" || p === "submitting") return;
      if (textRef.current?.mode === "custom") {
        resetRun();
        setPhase("ready");
      } else {
        loadText(textRef.current?.textId);
      }
      return;
    }
    if (e.key === "Escape") {
      // FR-09: прервать тест без сохранения
      e.preventDefault();
      if (p === "running" || p === "error") {
        resetRun();
        setPhase(textRef.current ? "ready" : "loading");
      }
      return;
    }
    if (p !== "ready" && p !== "running") return;

    const r = run.current;
    const target = textRef.current.text;

    if (e.key === "Backspace") {
      e.preventDefault();
      const last = r.typed.length - 1;
      if (last < 0 || p !== "running") return;
      if (r.typed[last] === " " && target[last] === " ") return; // в законченное слово не возвращаемся
      r.typed.pop();
      r.keystrokes.push({ t: Math.round(performance.now() - r.start), k: "Backspace" });
      setTyped(r.typed.join(""));
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();

    if (p === "ready") {
      // FR-06: таймер запускается при первом нажатии
      r.start = performance.now();
      setPhase("running");
      phaseRef.current = "running";
      startTimer();
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

    const mode = textRef.current.mode;
    if ((mode === "noerror" && !ok) || r.typed.length === target.length) finish();
  }, [finish, loadText, resetRun, startTimer]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  // ---- Свой текст (FR-15) ----
  const customLength = normalizeText(customDraft).length;
  const startCustom = () => {
    const clean = normalizeText(customDraft);
    if (clean.length < CUSTOM_MIN) return setError(t("test.customTooShort", { min: CUSTOM_MIN, n: clean.length }));
    if (clean.length > CUSTOM_MAX) return setError(t("test.customTooLong", { max: CUSTOM_MAX, n: clean.length }));
    storage.set("custom-text", customDraft);
    document.activeElement?.blur();
    resetRun();
    setText({ mode: "custom", language, difficulty, option: null, textId: null, author: null, text: clean });
    setPhase("ready");
  };

  // ---- Живые метрики (FR-08) ----
  const r = run.current;
  const running = phase === "running";
  const elapsed = running ? performance.now() - r.start : 0;
  const live = text ? liveMetrics({ typed, target: text.text, correctKeys: r.correctKeys, totalKeys: r.totalKeys, elapsedMs: elapsed }) : null;

  let counter = null;
  if (text?.mode === "time") {
    counter = <>{running ? Math.max(0, Math.ceil((text.option * 1000 - elapsed) / 1000)) : text.option}</>;
  } else if (text?.mode === "words") {
    const done = typed.split(" ").length - 1;
    counter = <>{done}<small>/ {text.option}</small></>;
  } else if (text) {
    counter = <>{Math.floor(elapsed / 1000)}<small>{t("test.sec")}</small></>;
  }

  return (
    <Layout focus={running} hints={[["tab", t("test.restart")], ["esc", t("test.reset")]]}>
      <TestSettings />

      {phase === "custom" ? (
        <div className="custom-box">
          <div className="label">{t("test.customTitle")}</div>
          <textarea
            value={customDraft}
            onChange={(e) => { setCustomDraft(e.target.value); setError(""); }}
            placeholder={t("test.customPlaceholder")}
            autoFocus
          />
          <div className="custom-row">
            <span className={error || customLength > CUSTOM_MAX ? "error-text" : "muted"} role={error ? "alert" : undefined}>
              {error || t("test.customCount", { n: customLength, max: CUSTOM_MAX })}
            </span>
            <button className="btn btn-primary btn-small" onClick={startCustom}>{t("test.customStart")}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="test-stats">
            <div className="timer" aria-live="off">{counter}</div>
            {live && (
              <div className="live">
                <span className="live-item"><span className="num small">{live.accuracy}%</span><span className="unit quiet">{t("test.acc")}</span></span>
                <span className="live-item"><span className="num small">{live.errors}</span><span className="unit quiet">{t("test.err")}</span></span>
                <span className="live-item"><span className="num">{running ? live.wpm : 0}</span><span className="unit">{t("test.wpm")}</span></span>
              </div>
            )}
          </div>

          {text && (phase === "ready" || phase === "running" || phase === "submitting" || phase === "error") ? (
            <>
              <WordsView target={text.text} typed={typed} errorPositions={errorPositions} idle={!running} />
              {text.author && <div className="author">{text.author}</div>}
            </>
          ) : (
            <div className="status-line">{phase === "loading" ? t("test.loading") : ""}</div>
          )}

          <div className="status-line" role="status">
            {phase === "ready" && t("test.startHint")}
            {phase === "ready" && text?.mode === "noerror" && ` · ${t("test.noErrorsHint")}`}
            {phase === "submitting" && t("test.submitting")}
            {phase === "error" && <span className="error-text">{error}</span>}
          </div>
          {text?.mode === "custom" && phase === "ready" && (
            <div className="center" style={{ marginTop: 12 }}>
              <button className="link-btn" onClick={() => { resetRun(); setPhase("custom"); }}>{t("test.editText")}</button>
            </div>
          )}
        </>
      )}

      <div className="test-actions">
        <button
          className="round-btn"
          onClick={(e) => { e.currentTarget.blur(); onKey({ key: "Tab", preventDefault() {} }); }}
          aria-label={t("test.newText")}
          title={t("test.newText")}
        >
          <Restart />
        </button>
        <span className="round-label">{running ? t("test.keepGoing") : t("test.newText")}</span>
      </div>
    </Layout>
  );
}
