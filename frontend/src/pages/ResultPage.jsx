import { useCallback, useEffect, useMemo } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { LineChart } from "../components/LineChart.jsx";
import { ArrowRight, Restart } from "../components/Icons.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { duration, fmt, int } from "../lib/format.js";
import { splitWords } from "../lib/metrics.js";

function headlineKey(r) {
  if (r.stoppedByError) return "result.h.stopped";
  if (r.saved && r.isRecord) return "result.h.record";
  if (r.accuracy >= 98) return "result.h.clean";
  if (r.accuracy >= 92) return "result.h.close";
  return "result.h.slow";
}

// Слово с подсветкой ошибочных букв.
function MarkedWord({ word, start, errors, typedLength }) {
  return (
    <span>
      {[...word].map((ch, i) => {
        const pos = start + i;
        const cls = errors.has(pos) ? "err" : pos >= typedLength ? "dim" : "";
        return <span key={i} className={cls}>{ch}</span>;
      })}
    </span>
  );
}

// SCR-02 «Результат теста» (FR-10).
export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const r = state?.result;

  const retry = useCallback(() => navigate("/", { state: { retryText: state.text } }), [navigate, state]);
  const next = useCallback(() => navigate("/"), [navigate]);

  useEffect(() => {
    if (!r) return undefined;
    const onKey = (e) => {
      if (e.key === "Tab") { e.preventDefault(); retry(); }
      if (e.key === "Enter" || e.key === "Escape") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [r, retry, next]);

  const errors = useMemo(() => new Set(r?.errorPositions || []), [r]);
  const shownWords = useMemo(() => {
    if (!r) return [];
    const words = splitWords(r.target);
    const lastTyped = words.findIndex((w) => w.start + w.word.length >= r.typed.length);
    const until = lastTyped === -1 ? words.length : Math.min(words.length, lastTyped + 1);
    return words.slice(0, Math.max(until, 1));
  }, [r]);

  if (!r) return <Navigate to="/" replace />;

  const modeLine = r.mode === "time"
    ? `${t("mode.time")} / ${t("result.seconds", { n: r.option })}`
    : r.mode === "words"
      ? `${t("mode.words")} / ${t("result.wordsCount", { n: r.option })}`
      : `${t(`mode.${r.mode}`)} / ${duration(r.durationMs)}`;
  const what = r.mode === "time" ? t("result.seconds", { n: r.option }) : r.mode === "words" ? t("result.wordsCount", { n: r.option }) : t(`mode.${r.mode}`);

  const letters = r.note.letters.map((l) => l.letter).join(", ");
  const noteText = r.errors === 0 ? t("result.note.cleanText") : r.errors === 1 ? t("result.note.text1", { letters }) : t("result.note.text", { n: r.errors, letters });

  return (
    <Layout wide hints={[["tab", t("hint.retry")], ["enter", t("hint.continue")], ["esc", t("hint.practice")]]}>
      <div className="result-head">
        <div>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="eyebrow">{t("result.eyebrow")}</span>
            {r.saved && r.isRecord && <span className="badge">{t("result.record")}</span>}
          </div>
          <h1 className="headline">{t(headlineKey(r))}</h1>
        </div>
        <div className="result-meta">
          <div>{modeLine}</div>
          <div className="muted">{t(`lang.${r.language}`)} · {t(`diff.${r.difficulty}`)}</div>
          <div className="muted">
            {r.saved
              ? `${t("result.saved")}${r.previousBest !== null ? ` · ${t("result.prevBest", { qs: fmt(r.previousBest, 1) })}` : ""}`
              : <Link to="/login" className="link-btn">{t("result.guestLink")}</Link>}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">{t("result.wpm")}</div>
          <div className="serif-num accent">{int(r.wpm)}</div>
          <div className="sub">{t("result.wpmSub", { raw: int(r.rawWpm) })}</div>
        </div>
        <div className="stat">
          <div className="label">{t("result.accuracy")}</div>
          <div className="serif-num">{fmt(r.accuracy, 1)}%</div>
          <div className="sub">{t("result.accuracySub", { ok: r.correctKeys, all: r.totalKeys })}</div>
        </div>
        <div className="stat">
          <div className="label">{t("result.qs")}</div>
          <div className="serif-num">{fmt(r.qualityScore, 1)}</div>
          <div className="sub">{t("result.qsSub")}</div>
        </div>
        <div className="stat">
          <div className="label">{t("result.chars")}</div>
          <div className="serif-num">{r.correctKeys} / {r.errors}</div>
          <div className="sub">{t("result.charsSub")} · {duration(r.durationMs)}</div>
        </div>
      </div>

      <div className="split">
        <div>
          <div className="section-head">
            <span className="label">{t("result.pace")}</span>
            <span className="legend">
              <span><i className="l-line" />{t("result.legendWpm")}</span>
              <span><i className="l-err" />{t("result.legendErr")}</span>
            </span>
          </div>
          <LineChart
            points={r.pace.map((p) => ({ x: p.second, y: p.wpm, errors: p.errors }))}
            xLabel={(x) => `${x}s`}
          />
        </div>
        <div>
          <span className="label">{t("result.noteLabel")}</span>
          <div className="note-head">{t(r.errors === 0 ? "result.note.clean" : "result.note.errors")}</div>
          <div className="note-text">{noteText}</div>
          {r.note.words.length > 0 && (
            <div className="note-words">
              {r.note.words.map((w) => (
                <MarkedWord key={w.start} word={w.word} start={w.start} errors={errors} typedLength={Infinity} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="your-words">
        <div className="row-head">
          <span className="label">{t("result.yourWords")}</span>
          <span className="muted" style={{ fontSize: 10 }}>{t("result.wordsLegend")}</span>
        </div>
        <div className="typed-words">
          {shownWords.map((w, i) => (
            <span key={w.start}>
              <MarkedWord word={w.word} start={w.start} errors={errors} typedLength={r.typed.length} />
              {i < shownWords.length - 1 ? " " : ""}
            </span>
          ))}
        </div>
      </div>

      {!r.saved && <div className="caption" style={{ marginTop: 28 }}>{t("result.guest")}</div>}

      <div className="result-actions">
        <button className="btn btn-ghost" onClick={retry}><Restart size={16} />{t("result.retry")}</button>
        <button className="btn btn-primary" onClick={next}>{t("result.continue")}<ArrowRight /></button>
      </div>
      <div className="caption">{t("result.caption", { what })}</div>
    </Layout>
  );
}
