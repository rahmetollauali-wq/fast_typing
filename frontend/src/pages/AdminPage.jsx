import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { Layout } from "../components/Layout.jsx";
import { Pill, PillGroup } from "../components/PillGroup.jsx";
import { DIFFICULTIES, LANGUAGES } from "../context/SettingsContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

const TEXT_MODES = ["classic", "quotes", "words"];

// Управление текстами — UC-07, FR-16 (только администратор).
export default function AdminPage() {
  const { t, errorText } = useI18n();
  const [filters, setFilters] = useState({ mode: "classic", language: "", difficulty: "" });
  const [texts, setTexts] = useState([]);
  const [form, setForm] = useState({ mode: "classic", language: "en", difficulty: "medium", author: "", body: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.adminTexts(filters).then(setTexts).catch((err) => setError(errorText(err)));
  }, [filters, errorText]);

  useEffect(load, [load]);

  const flash = (msg) => {
    setMessage(msg);
    setError("");
    setTimeout(() => setMessage(""), 4000);
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.adminCreateText(form);
      setForm((f) => ({ ...f, body: "", author: "" }));
      flash(t("admin.added"));
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (id) => {
    try {
      const res = await api.adminDeleteText(id);
      flash(res.deactivated ? t("admin.deactivated") : t("admin.deleted"));
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const restore = async (id) => {
    try {
      await api.adminRestoreText(id);
      load();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const set = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  return (
    <Layout wide>
      <div style={{ marginTop: 40 }}>
        <span className="eyebrow">{t("admin.eyebrow")}</span>
        <h1 className="headline">{t("admin.headline")}</h1>
      </div>

      <form className="section" onSubmit={create}>
        <span className="label">{t("admin.add")}</span>
        <div className="admin-form">
          <select className="input" value={form.mode} onChange={set("mode")} aria-label="mode">
            {TEXT_MODES.map((m) => <option key={m} value={m}>{t(`mode.${m}`)}</option>)}
          </select>
          <select className="input" value={form.language} onChange={set("language")} aria-label="language">
            {LANGUAGES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
          </select>
          <select className="input" value={form.difficulty} onChange={set("difficulty")} aria-label="difficulty">
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{t(`diff.${d}`)}</option>)}
          </select>
          <input className="input" placeholder={t("admin.author")} value={form.author} onChange={set("author")} />
          <textarea className="input wide" placeholder={t("admin.body")} value={form.body} onChange={set("body")} />
          <div className="wide" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <button className="btn btn-primary btn-small" type="submit">{t("admin.save")}</button>
            {message && <span className="muted">{message}</span>}
            {error && <span className="error-text" role="alert">{error}</span>}
          </div>
        </div>
      </form>

      <div className="section">
        <div className="section-head">
          <PillGroup label="mode">
            {TEXT_MODES.map((m) => <Pill key={m} on={filters.mode === m} onClick={() => setFilters((f) => ({ ...f, mode: m }))}>{t(`mode.${m}`)}</Pill>)}
          </PillGroup>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <select className="select" value={filters.language} onChange={(e) => setFilters((f) => ({ ...f, language: e.target.value }))} aria-label="language">
              <option value="">{t("admin.any")}</option>
              {LANGUAGES.map((l) => <option key={l} value={l}>{t(`lang.${l}`)}</option>)}
            </select>
            <select className="select" value={filters.difficulty} onChange={(e) => setFilters((f) => ({ ...f, difficulty: e.target.value }))} aria-label="difficulty">
              <option value="">{t("admin.any")}</option>
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{t(`diff.${d}`)}</option>)}
            </select>
            <span className="muted" style={{ fontSize: 11 }}>{t("admin.total", { n: texts.length })}</span>
          </div>
        </div>

        <div className="admin-list">
          {texts.map((x) => (
            <div className={`admin-row${x.is_active ? "" : " off"}`} key={x.id}>
              <div>
                <div className="body">{x.body.length > 320 ? `${x.body.slice(0, 320)}…` : x.body}</div>
                <div className="meta">
                  #{x.id} · {t(`mode.${x.mode}`)} · {t(`lang.${x.language}`)} · {t(`diff.${x.difficulty}`)}
                  {x.author ? ` · ${x.author}` : ""}
                  {!x.is_active ? ` · ${t("admin.hidden")}` : ""}
                </div>
              </div>
              {x.is_active ? (
                <button className="btn btn-ghost btn-small" onClick={() => remove(x.id)}>{t("admin.delete")}</button>
              ) : (
                <button className="btn btn-ghost btn-small" onClick={() => restore(x.id)}>{t("admin.restore")}</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
