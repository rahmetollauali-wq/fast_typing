import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { Pill, PillGroup, PillSep } from "../components/PillGroup.jsx";
import { ArrowRight } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { DIFFICULTIES, LANGUAGES, OPTIONS, useSettings } from "../context/SettingsContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { fmt, int, relativeTime } from "../lib/format.js";
import "../duel/duel.css";

const DUEL_MODES = ["classic", "words", "quotes", "time"];

// Лобби дуэлей: создать вызов (получить код) или войти по коду друга.
export default function DuelLobbyPage() {
  const { t, lang, errorText } = useI18n();
  const { user } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();

  const [form, setForm] = useState(() => ({
    mode: DUEL_MODES.includes(settings.mode) ? settings.mode : "classic",
    timeOption: settings.timeOption,
    wordsOption: settings.wordsOption,
    language: settings.language,
    difficulty: settings.difficulty,
  }));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [history, setHistory] = useState(null);

  useEffect(() => {
    if (user) api.duelHistory().then(setHistory).catch(() => {});
  }, [user]);

  const option = form.mode === "time" ? form.timeOption : form.mode === "words" ? form.wordsOption : null;
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const room = await api.createDuel({ mode: form.mode, option, language: form.language, difficulty: form.difficulty });
      navigate(`/duel/${room.code}`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const join = async (e) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) return;
    setJoinError("");
    try {
      await api.getDuel(clean); // проверяем, что комната существует
      navigate(`/duel/${clean}`);
    } catch (err) {
      setJoinError(errorText(err));
    }
  };

  const modeLabel = (r) => `${t(`mode.${r.mode}`)}${r.option ? ` ${r.option}${r.mode === "time" ? "s" : ""}` : ""}`;

  return (
    <Layout wide>
      <div style={{ marginTop: 40 }}>
        <span className="eyebrow">{t("duel.eyebrow")}</span>
        <h1 className="headline">{t("duel.headline")}</h1>
      </div>

      {!user ? (
        <div className="empty">
          <Link to="/login?next=/duel" className="btn btn-primary">{t("duel.signin")}<ArrowRight /></Link>
        </div>
      ) : (
        <>
          <div className="duel-grid">
            <div className="duel-card">
              <h2>{t("duel.create")}</h2>
              <span className="hint-text">{t("duel.createHint")}</span>
              <PillGroup label="mode">
                {DUEL_MODES.map((m) => <Pill key={m} on={form.mode === m} onClick={() => set({ mode: m })}>{t(`mode.${m}`)}</Pill>)}
              </PillGroup>
              <PillGroup label="options">
                {OPTIONS[form.mode] && (
                  <>
                    {OPTIONS[form.mode].map((o) => (
                      <Pill key={o} on={option === o} onClick={() => set(form.mode === "time" ? { timeOption: o } : { wordsOption: o })}>{o}</Pill>
                    ))}
                    <PillSep />
                  </>
                )}
                {LANGUAGES.map((l) => <Pill key={l} on={form.language === l} onClick={() => set({ language: l })}>{l}</Pill>)}
                <PillSep />
                {DIFFICULTIES.map((d) => <Pill key={d} on={form.difficulty === d} onClick={() => set({ difficulty: d })}>{t(`diff.${d}`)}</Pill>)}
              </PillGroup>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <button className="btn btn-primary" onClick={create} disabled={busy}>{t("duel.createBtn")}<ArrowRight /></button>
                {error && <span className="error-text" role="alert">{error}</span>}
              </div>
            </div>

            <form className="duel-card" onSubmit={join}>
              <h2>{t("duel.join")}</h2>
              <span className="hint-text">{t("duel.joinHint")}</span>
              <input
                className="code-input"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6)); setJoinError(""); }}
                placeholder={t("duel.codePlaceholder")}
                aria-label={t("duel.join")}
                autoComplete="off"
                spellCheck={false}
              />
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <button className="btn btn-ghost" type="submit" disabled={code.length < 6}>{t("duel.joinBtn")}<ArrowRight /></button>
                {joinError && <span className="error-text" role="alert">{joinError}</span>}
              </div>
            </form>
          </div>

          {history && (
            <>
              <div className="duel-stats">
                <div className="stat"><div className="label">{t("duel.stats.total")}</div><div className="serif-num">{history.stats.total}</div></div>
                <div className="stat"><div className="label">{t("duel.stats.wins")}</div><div className="serif-num accent">{history.stats.wins}</div></div>
                <div className="stat"><div className="label">{t("duel.stats.losses")}</div><div className="serif-num">{history.stats.losses}</div></div>
                <div className="stat"><div className="label">{t("duel.stats.draws")}</div><div className="serif-num">{history.stats.draws}</div></div>
              </div>

              <div className="section">
                <span className="label">{t("duel.recent")}</span>
                {history.rows.length === 0 ? (
                  <div className="empty">{t("duel.noDuels")}</div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("board.recorded")}</th>
                        <th>{t("duel.opponent")}</th>
                        <th className="hide-sm">{t("profile.mode")}</th>
                        <th className="num-col">{t("duel.you")} · WPM</th>
                        <th className="num-col">{t("duel.them")} · WPM</th>
                        <th className="num-col hide-sm">QS</th>
                        <th className="num-col"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.rows.map((r) => (
                        <tr key={r.id}>
                          <td className="quiet">{relativeTime(r.finishedAt, lang)}</td>
                          <td>{r.opponent}</td>
                          <td className="quiet hide-sm">{modeLabel(r)} · {r.language.toUpperCase()} · {t(`diff.${r.difficulty}`)}</td>
                          <td className="num-col big">{r.me.wpm !== null ? int(r.me.wpm) : "—"}</td>
                          <td className="num-col big" style={{ color: "var(--text-2)" }}>{r.them.wpm !== null ? int(r.them.wpm) : "—"}</td>
                          <td className="num-col quiet hide-sm">
                            {r.me.qualityScore !== null ? fmt(r.me.qualityScore, 1) : "—"} / {r.them.qualityScore !== null ? fmt(r.them.qualityScore, 1) : "—"}
                          </td>
                          <td className="num-col"><span className={`outcome ${r.outcome}`}>{t(`duel.outcome.${r.outcome}`)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
