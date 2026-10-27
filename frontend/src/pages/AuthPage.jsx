import { useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { Pill, PillGroup } from "../components/PillGroup.jsx";
import { ArrowRight } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";

// Вход и регистрация — UC-01, UC-02 (FR-01, FR-02).
export default function AuthPage() {
  const { t, errorText } = useI18n();
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  // ?next=/duel/ABC123 — вернуться в комнату дуэли после входа
  const [params] = useSearchParams();
  const next = params.get("next")?.startsWith("/") ? params.get("next") : "/";
  const [tab, setTab] = useState("signin");
  const [form, setForm] = useState({ login: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // После успешного входа уходим на тест; редирект в профиль — только если пользователь
  // открыл /login, уже будучи авторизованным.
  const submittedRef = useRef(false);

  if (user && !submittedRef.current) return <Navigate to="/profile" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    submittedRef.current = true;
    try {
      if (tab === "signin") await login(form.login, form.password);
      else await register(form.login, form.password);
      navigate(next);
    } catch (err) {
      submittedRef.current = false;
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (name) => ({
    value: form[name],
    onChange: (e) => { setForm((f) => ({ ...f, [name]: e.target.value })); setError(""); },
  });

  return (
    <Layout>
      <div className="auth">
        <span className="eyebrow">{t("auth.eyebrow")}</span>
        <h1 className="headline">{t("auth.headline")}</h1>

        <div style={{ marginTop: 28 }}>
          <PillGroup label="account">
            <Pill on={tab === "signin"} onClick={() => { setTab("signin"); setError(""); }}>{t("auth.signin")}</Pill>
            <Pill on={tab === "signup"} onClick={() => { setTab("signup"); setError(""); }}>{t("auth.signup")}</Pill>
          </PillGroup>
        </div>

        <form className="form" onSubmit={submit} noValidate>
          <label className="field">
            <span className="label">{t("auth.login")}</span>
            <input className="input" name="login" autoComplete="username" autoFocus required {...field("login")} />
            {tab === "signup" && <span className="hint-text">{t("auth.loginHint")}</span>}
          </label>
          <label className="field">
            <span className="label">{t("auth.password")}</span>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
              required
              {...field("password")}
            />
            {tab === "signup" && <span className="hint-text">{t("auth.passwordHint")}</span>}
          </label>
          {error && <div className="error-text" role="alert">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={busy} style={{ justifyContent: "center" }}>
            {tab === "signin" ? t("auth.submitIn") : t("auth.submitUp")}
            <ArrowRight />
          </button>
          <Link to="/" className="link-btn" style={{ textAlign: "center", fontSize: 12 }}>{t("auth.guest")}</Link>
        </form>
      </div>
    </Layout>
  );
}
