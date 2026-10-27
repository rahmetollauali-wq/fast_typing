import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { ChevronUp, Keyboard, Swords, Trophy, User } from "./Icons.jsx";

export const BRAND = "tempo";

function Header() {
  const { user } = useAuth();
  const { t, lang, setLang } = useI18n();
  const cls = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;

  return (
    <header className="header">
      <Link to="/" className="logo" aria-label={BRAND}>
        <span className="logo-mark"><ChevronUp /></span>
        <span className="logo-word">{BRAND}</span>
      </Link>
      <nav className="nav">
        {user?.role === "admin" && (
          <NavLink to="/admin" className={cls} title={t("nav.admin")} aria-label={t("nav.admin")}>
            <Keyboard />
          </NavLink>
        )}
        <NavLink to="/duel" className={cls} title={t("nav.duel")}>
          <Swords />
          <span>{t("nav.duel")}</span>
        </NavLink>
        <NavLink to="/leaderboard" className={cls} title={t("nav.leaderboard")} aria-label={t("nav.leaderboard")}>
          <Trophy />
        </NavLink>
        <NavLink to="/" end className={cls}>{t("nav.practice")}</NavLink>
        <div className="lang-switch" aria-label="Interface language">
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
          <span className="muted">/</span>
          <button className={lang === "ru" ? "on" : ""} onClick={() => setLang("ru")}>RU</button>
        </div>
        <NavLink
          to={user ? "/profile" : "/login"}
          className={cls}
          title={user ? `${t("nav.profile")} · ${user.login}` : t("nav.signin")}
          aria-label={user ? t("nav.profile") : t("nav.signin")}
        >
          <User />
          {!user && <span>{t("nav.signin")}</span>}
        </NavLink>
      </nav>
    </header>
  );
}

export function Footer({ hints = [] }) {
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="hints">
        {hints.map(([key, label]) => (
          <span className="hint" key={key}><kbd>{key}</kbd>{label}</span>
        ))}
      </div>
      <span className="version">{t("common.version")}</span>
    </footer>
  );
}

// Каркас страницы: шапка, содержимое, подвал с подсказками клавиш.
export function Layout({ children, hints, wide = false, focus = false }) {
  return (
    <div className={`shell${wide ? " wide" : ""}${focus ? " typing-focus" : ""}`}>
      <Header />
      <main className="main">{children}</main>
      <Footer hints={hints} />
    </div>
  );
}
