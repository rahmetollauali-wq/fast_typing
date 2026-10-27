import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { Pill, PillGroup } from "../components/PillGroup.jsx";
import { ArrowLeft, ArrowRight } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { DIFFICULTIES, LANGUAGES, MODES, useSettings } from "../context/SettingsContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { fmt, int, pad2, relativeTime } from "../lib/format.js";

const BOARD_MODES = MODES.filter((m) => m !== "custom");
const PERIODS = ["today", "week", "all"];

function Row({ row, lang, t, me = false }) {
  return (
    <tr className={me ? "me" : ""}>
      <td className="rank">{row.rank < 100 ? pad2(row.rank) : row.rank}</td>
      <td>
        {me ? t("board.you") : row.login}
        {me && <div className="quiet">{t("board.latest")}</div>}
      </td>
      <td className="num-col big">{int(row.wpm)}</td>
      <td className="num-col">{fmt(row.accuracy, 1)}%</td>
      <td className="num-col hide-sm">{int(row.rawWpm)}</td>
      <td className="num-col">{fmt(row.qualityScore, 1)}</td>
      <td className="num-col quiet hide-sm">{relativeTime(row.recordedAt, lang)}</td>
    </tr>
  );
}

// Таблица лидеров — UC-05, FR-14 (топ-50).
export default function LeaderboardPage() {
  const { t, lang, errorText } = useI18n();
  const { user } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();

  const [filters, setFilters] = useState(() => ({
    period: "all",
    mode: settings.mode === "custom" ? "classic" : settings.mode,
    language: settings.language,
    difficulty: settings.difficulty,
    page: 1,
  }));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setError("");
    api.leaderboard(filters)
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(errorText(err)));
    return () => { alive = false; };
  }, [filters, user, errorText]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !["INPUT", "SELECT"].includes(document.activeElement?.tagName)) navigate("/");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const set = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const rows = data?.rows || [];
  const me = data?.me;
  const meVisible = me && rows.some((r) => r.isMe);
  const from = rows.length ? (data.page - 1) * data.pageSize + 1 : 0;
  const shownTotal = Math.min(data?.total || 0, 50);

  return (
    <Layout wide hints={[["esc", t("hint.practice")]]}>
      <div className="result-head" style={{ marginTop: 40 }}>
        <div>
          <span className="eyebrow">{t("board.eyebrow")}</span>
          <h1 className="headline">{t("board.headline")}</h1>
        </div>
        <div className="select-wrap">
          <select className="select" value={filters.language} onChange={(e) => set({ language: e.target.value })} aria-label="language">
            {LANGUAGES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
          </select>
          <select className="select small" value={filters.difficulty} onChange={(e) => set({ difficulty: e.target.value })} aria-label="difficulty">
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{t(`diff.${d}`)}</option>)}
          </select>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <PillGroup label="period">
            {PERIODS.map((p) => <Pill key={p} on={filters.period === p} onClick={() => set({ period: p })}>{t(`board.${p}`)}</Pill>)}
          </PillGroup>
          <PillGroup label="mode">
            {BOARD_MODES.map((m) => <Pill key={m} on={filters.mode === m} onClick={() => set({ mode: m })}>{t(`mode.${m}`)}</Pill>)}
          </PillGroup>
        </div>
        <span style={{ fontSize: 11 }}>{t("board.typists", { n: fmt(data?.total || 0) })}</span>
      </div>

      {error && <div className="empty error-text">{error}</div>}

      {data && !error && (
        rows.length === 0 ? (
          <div className="empty">{t("board.empty")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("board.rank")}</th>
                <th>{t("board.typist")}</th>
                <th className="num-col">{t("board.wpm")}</th>
                <th className="num-col">{t("board.accuracy")}</th>
                <th className="num-col hide-sm">{t("board.raw")}</th>
                <th className="num-col">{t("board.qs")} ↓</th>
                <th className="num-col hide-sm">{t("board.recorded")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => <Row key={row.rank} row={row} lang={lang} t={t} me={row.isMe} />)}
              {me && !meVisible && (
                <>
                  <tr className="gap">
                    <td>···</td>
                    <td colSpan={6} className="num-col">{t("board.yourPlace", { rank: me.rank, total: fmt(data.total) }).toUpperCase()}</td>
                  </tr>
                  <Row row={me} lang={lang} t={t} me />
                </>
              )}
            </tbody>
          </table>
        )
      )}

      {data && rows.length > 0 && (
        <div className="table-foot">
          <div>
            <div>{t("board.foot1")}</div>
            <div className="muted">{t("board.foot2", { lang: t(`lang.${data.language}`), diff: t(`diff.${data.difficulty}`), n: 50 })}</div>
          </div>
          <div className="pager">
            <button disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} aria-label="previous"><ArrowLeft size={14} /></button>
            <span>{t("board.range", { from, to: from + rows.length - 1, total: shownTotal })}</span>
            <button disabled={data.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} aria-label="next"><ArrowRight size={14} /></button>
          </div>
        </div>
      )}

      <div className="result-actions">
        {user ? (
          <Link to="/" className="btn btn-primary">{t("result.continue")}<ArrowRight /></Link>
        ) : (
          <Link to="/login" className="btn btn-primary">{t("board.signin")}<ArrowRight /></Link>
        )}
      </div>
    </Layout>
  );
}
