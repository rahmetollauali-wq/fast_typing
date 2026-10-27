import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { LineChart } from "../components/LineChart.jsx";
import { Pill, PillGroup } from "../components/PillGroup.jsx";
import { ArrowLeft, ArrowRight } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { MODES } from "../context/SettingsContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { duration, fmt, hours, int, shortDate } from "../lib/format.js";

// Профиль: сводка, рекорды и история попыток — UC-04, FR-13.
export default function ProfilePage() {
  const { t, lang, errorText } = useI18n();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [filter, setFilter] = useState({ mode: "", page: 1 });
  const [error, setError] = useState("");

  useEffect(() => {
    api.profile().then(setProfile).catch((err) => setError(errorText(err)));
  }, [errorText]);

  useEffect(() => {
    api.history(filter).then(setHistory).catch((err) => setError(errorText(err)));
  }, [filter, errorText]);

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  const modeLabel = (row) => {
    const base = t(`mode.${row.mode}`);
    return row.mode_option ? `${base} ${row.mode_option}${row.mode === "time" ? "s" : ""}` : base;
  };

  if (error) return <Layout><div className="empty error-text">{error}</div></Layout>;
  if (!profile) return <Layout><div className="empty">{t("common.loading")}</div></Layout>;

  const { stats, records, progress, user } = profile;

  return (
    <Layout wide>
      <div className="result-head" style={{ marginTop: 40 }}>
        <div>
          <span className="eyebrow">{t("profile.eyebrow")}</span>
          <h1 className="headline">{t("profile.hello", { name: user.login })}</h1>
        </div>
        <div className="result-meta">
          <button className="btn btn-ghost btn-small" onClick={onLogout}>{t("profile.logout")}</button>
          <div className="muted" style={{ marginTop: 8 }}>{t("profile.timeSpent", { t: hours(stats.total_ms, lang) })}</div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat"><div className="label">{t("profile.attempts")}</div><div className="serif-num">{stats.attempts}</div></div>
        <div className="stat"><div className="label">{t("profile.bestWpm")}</div><div className="serif-num accent">{int(stats.best_wpm)}</div></div>
        <div className="stat"><div className="label">{t("profile.avgWpm")}</div><div className="serif-num">{fmt(stats.avg_wpm, 1)}</div></div>
        <div className="stat"><div className="label">{t("profile.avgAcc")}</div><div className="serif-num">{fmt(stats.avg_accuracy, 1)}%</div></div>
      </div>

      {stats.attempts === 0 ? (
        <div className="empty">
          {t("profile.noHistory")} <Link to="/" className="link-btn">{t("profile.start")}</Link>
        </div>
      ) : (
        <>
          <div className="split">
            <div>
              <span className="label">{t("profile.progress")}</span>
              <LineChart points={progress.map((p, i) => ({ x: i + 1, y: p.wpm }))} xLabel={(x) => `#${x}`} showDots />
            </div>
            <div>
              <span className="label">{t("profile.records")}</span>
              {records.length === 0 ? (
                <div className="muted" style={{ marginTop: 16 }}>{t("profile.noRecords")}</div>
              ) : (
                <div className="records">
                  {records.slice(0, 6).map((r) => (
                    <div className="record-card" key={`${r.mode}-${r.language}-${r.difficulty}`}>
                      <div>
                        <div className="title">{t(`mode.${r.mode}`)}</div>
                        <div className="sub">{r.language.toUpperCase()} · {t(`diff.${r.difficulty}`)} · {int(r.wpm)} wpm</div>
                      </div>
                      <div className="serif-num">{fmt(r.quality_score, 1)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <div className="section-head">
              <span className="label">{t("profile.history")}</span>
              <PillGroup label="mode filter">
                <Pill on={!filter.mode} onClick={() => setFilter({ mode: "", page: 1 })}>{t("profile.all")}</Pill>
                {MODES.map((m) => (
                  <Pill key={m} on={filter.mode === m} onClick={() => setFilter({ mode: m, page: 1 })}>{t(`mode.${m}`)}</Pill>
                ))}
              </PillGroup>
            </div>
            {history && history.rows.length === 0 && <div className="empty">{t("profile.noHistory")}</div>}
            {history && history.rows.length > 0 && (
              <>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("profile.date")}</th>
                      <th>{t("profile.mode")}</th>
                      <th className="hide-sm">{t("profile.text")}</th>
                      <th className="num-col">{t("board.wpm")}</th>
                      <th className="num-col">{t("board.accuracy")}</th>
                      <th className="num-col hide-sm">{t("test.err")}</th>
                      <th className="num-col hide-sm">{t("profile.time")}</th>
                      <th className="num-col">{t("board.qs")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.rows.map((row) => (
                      <tr key={row.id}>
                        <td className="quiet">{shortDate(row.created_at, lang)}</td>
                        <td>{modeLabel(row)}</td>
                        <td className="quiet hide-sm">{row.language.toUpperCase()} · {t(`diff.${row.difficulty}`)}</td>
                        <td className="num-col big">{int(row.wpm)}</td>
                        <td className="num-col">{fmt(row.accuracy, 1)}%</td>
                        <td className="num-col hide-sm">{row.errors}</td>
                        <td className="num-col quiet hide-sm">{duration(row.duration_ms)}</td>
                        <td className="num-col">{fmt(row.quality_score, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="table-foot">
                  <span className="muted">{t("profile.totalRows", { total: history.total, size: history.pageSize })}</span>
                  <div className="pager">
                    <button disabled={history.page <= 1} onClick={() => setFilter((f) => ({ ...f, page: f.page - 1 }))} aria-label="previous"><ArrowLeft size={14} /></button>
                    <span>{history.page} / {history.pages}</span>
                    <button disabled={history.page >= history.pages} onClick={() => setFilter((f) => ({ ...f, page: f.page + 1 }))} aria-label="next"><ArrowRight size={14} /></button>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
