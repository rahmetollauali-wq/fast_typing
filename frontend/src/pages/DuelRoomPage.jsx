import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Layout } from "../components/Layout.jsx";
import { WordsView } from "../components/WordsView.jsx";
import { ArrowRight, Restart } from "../components/Icons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useI18n } from "../i18n/I18nContext.jsx";
import { duration, fmt, int } from "../lib/format.js";
import { useDuelSocket } from "../duel/useDuelSocket.js";
import { useDuelTyping } from "../duel/useDuelTyping.js";
import "../duel/duel.css";

// Копирование работает и по http://IP:5173, где navigator.clipboard недоступен.
function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(value);
  const el = document.createElement("textarea");
  el.value = value;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  el.remove();
  return Promise.resolve();
}

function useNow(active, every = 200) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [active, every]);
  return now;
}

function settingsLine(s, t) {
  const opt = s.option ? ` ${s.option}${s.mode === "time" ? "s" : ""}` : "";
  return `${t(`mode.${s.mode}`)}${opt} · ${t(`lang.${s.language}`)} · ${t(`diff.${s.difficulty}`)}`;
}

// ---------- Ожидание соперника ----------
function Waiting({ room, me, t, now, offset, onLeave }) {
  const [copied, setCopied] = useState("");
  const isHost = room.hostId === me?.id;
  const left = Math.max(0, room.expiresAt - (Date.now() + offset));
  const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const link = `${window.location.origin}/duel/${room.code}`;

  const copy = (what, value) => copyText(value).then(() => {
    setCopied(what);
    setTimeout(() => setCopied(""), 1600);
  });

  return (
    <div className="room-wait">
      <span className="eyebrow">{t("duel.waitingTitle")}</span>
      <span className="label" style={{ marginTop: 18 }}>{t("duel.shareCode")}</span>
      <div className="room-code" data-testid="room-code">{room.code}</div>
      <span className="muted">{settingsLine(room.settings, t)}</span>
      <div className="room-actions">
        <button className="btn btn-primary btn-small" onClick={() => copy("code", room.code)}>{copied === "code" ? t("duel.copied") : t("duel.copyCode")}</button>
        <button className="btn btn-ghost btn-small" onClick={() => copy("link", link)}>{copied === "link" ? t("duel.copied") : t("duel.copyLink")}</button>
      </div>
      <span className="muted" style={{ fontSize: 11 }}>{t("duel.expires", { t: duration(left) })}</span>
      {local && <p className="lan-hint">{t("duel.lanHint")}</p>}

      <div className="player-chips">
        {room.players.map((p) => (
          <span className="player-chip" key={p.id}>
            <span className="dot" />
            {p.id === me?.id ? `${p.login} (${t("duel.you").toLowerCase()})` : p.login}
            {p.id === room.hostId && <span className="muted">· {t("duel.host")}</span>}
          </span>
        ))}
        {room.players.length < 2 && <span className="player-chip is-empty"><span className="dot" />{t("duel.waitingFor")}</span>}
      </div>

      <button className="link-btn" style={{ marginTop: 24 }} onClick={onLeave}>{isHost ? t("duel.cancel") : t("duel.leave")}</button>
    </div>
  );
}

// ---------- Полосы прогресса ----------
function Lanes({ room, me, t }) {
  const total = room.text?.text.length || 1;
  const players = [...room.players].sort((a, b) => (a.id === me?.id ? -1 : b.id === me?.id ? 1 : 0));
  return (
    <div className="lanes">
      {players.map((p) => {
        const pct = Math.min(100, (p.progress.typed / total) * 100);
        const sub = p.dnf ? t("duel.dnf") : p.finished ? t("duel.finishedTag") : !p.connected ? t("duel.offline") : "";
        return (
          <div className={`lane${p.id === me?.id ? " me" : ""}`} key={p.id} data-testid="lane">
            <div className="lane-name">
              <span>{p.id === me?.id ? t("duel.you") : p.login}</span>
              <span className="sub">{sub}</span>
            </div>
            <div className="lane-track"><div className="lane-fill" style={{ width: `${pct}%` }} /></div>
            <div className="lane-wpm">{p.result ? int(p.result.wpm) : p.progress.wpm}<small>wpm</small></div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Итоги ----------
function Results({ room, me, t, onRematch }) {
  const opp = room.players.find((p) => p.id !== me?.id);
  const mine = room.players.find((p) => p.id === me?.id);
  const cols = [mine, opp].filter(Boolean);
  const winner = room.players.find((p) => p.id === room.winnerId);
  const anyValid = room.players.some((p) => p.result && !p.dnf);

  const headline = winner
    ? winner.id === me?.id ? t("duel.youWin") : t("duel.youLose", { name: winner.login })
    : anyValid ? t("duel.draw") : t("duel.noWinner");

  // higher = true — больше значит лучше
  const rows = [
    ["duel.m.wpm", (r) => r.wpm, (v) => int(v), true],
    ["duel.m.accuracy", (r) => r.accuracy, (v) => `${fmt(v, 1)}%`, true],
    ["duel.m.qs", (r) => r.qualityScore, (v) => fmt(v, 1), true],
    ["duel.m.errors", (r) => r.errors, (v) => v, false],
    ["duel.m.raw", (r) => r.rawWpm, (v) => int(v), true],
    ...(room.settings.mode === "time" ? [] : [["duel.m.time", (r) => r.durationMs, (v) => duration(v), false]]),
  ];

  const dnfText = (p) => `${t("duel.dnf")}${p.dnfReason && t(`duel.dnf.${p.dnfReason}`) !== `duel.dnf.${p.dnfReason}` ? ` · ${t(`duel.dnf.${p.dnfReason}`)}` : ""}`;

  return (
    <>
      <div className="result-head">
        <div>
          <span className="eyebrow">{t("duel.resultEyebrow")}</span>
          <h1 className="headline" data-testid="duel-headline">{headline}</h1>
        </div>
        <div className="result-meta">
          <div>{settingsLine(room.settings, t)}</div>
          <div className="muted">{t("duel.winnerRule")}</div>
        </div>
      </div>

      <table className="vs-table">
        <thead>
          <tr>
            <th>{t("duel.metric")}</th>
            {cols.map((p) => (
              <th key={p.id} className={p.id === room.winnerId ? "winner" : ""}>
                {p.id === me?.id ? t("duel.you") : p.login}
                <span className="tag">
                  {p.dnf ? dnfText(p) : p.result?.isRecord ? t("duel.record") : p.id === room.winnerId ? "★" : " "}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, get, show, higher]) => {
            const values = cols.map((p) => (p.result && !p.dnf ? get(p.result) : null));
            const valid = values.filter((v) => v !== null);
            const best = valid.length > 1 ? (higher ? Math.max(...valid) : Math.min(...valid)) : null;
            const allSame = valid.length > 1 && valid.every((v) => v === valid[0]);
            return (
              <tr key={key}>
                <td>{t(key)}</td>
                {values.map((v, i) => (
                  <td key={cols[i].id} className={v === null ? "na" : v === best && !allSame ? "best" : ""}>
                    {v === null ? "—" : show(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="result-actions">
        <button className="btn btn-ghost" onClick={onRematch}><Restart size={16} />{t("duel.rematch")}</button>
        <Link to="/duel" className="btn btn-primary">{t("duel.toLobby")}<ArrowRight /></Link>
      </div>
    </>
  );
}

// ---------- Страница комнаты ----------
export default function DuelRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { t, errorText } = useI18n();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Layout>
        <div className="room-wait">
          <span className="eyebrow">{t("duel.eyebrow")}</span>
          <div className="room-code">{code}</div>
          <Link to={`/login?next=/duel/${code}`} className="btn btn-primary">{t("duel.signin")}<ArrowRight /></Link>
        </div>
      </Layout>
    );
  }
  return <Room code={code.toUpperCase()} user={user} t={t} errorText={errorText} navigate={navigate} />;
}

function Room({ code, user, t, errorText, navigate }) {
  const { room, error, status, send, clockOffset } = useDuelSocket(code);
  const me = room?.players.find((p) => p.id === user.id) || null;
  const opponent = room?.players.find((p) => p.id !== user.id) || null;
  const running = room?.status === "running";

  const onProgress = useCallback((p) => send({ type: "progress", ...p }), [send]);
  const onFinish = useCallback((keystrokes) => send({ type: "finish", keystrokes }), [send]);
  const typing = useDuelTyping({ text: room?.text, enabled: running && !me?.finished, onProgress, onFinish });

  const now = useNow(room && ["waiting", "countdown"].includes(room.status), room?.status === "countdown" ? 100 : 1000);

  const leave = () => {
    send({ type: "leave" });
    navigate("/duel");
  };

  // Ошибка входа (неверный код, комната полная) — до того, как мы попали в комнату.
  if (error && !me) {
    return (
      <Layout>
        <div className="room-wait">
          <span className="eyebrow">{t("duel.eyebrow")}</span>
          <div className="room-code" style={{ color: "var(--text-3)" }}>{code}</div>
          <span className="error-text" role="alert">{errorText(error)}</span>
          <Link to="/duel" className="btn btn-ghost btn-small" style={{ marginTop: 18 }}>{t("duel.toLobby")}</Link>
        </div>
      </Layout>
    );
  }

  if (!room) {
    return <Layout><div className="status-line">{status === "reconnecting" ? t("duel.reconnecting") : t("duel.connecting")}</div></Layout>;
  }

  if (room.status === "cancelled") {
    return (
      <Layout>
        <div className="room-wait">
          <span className="eyebrow">{t("duel.eyebrow")}</span>
          <span className="error-text">{errorText({ code: "NOT_FOUND" })}</span>
          <Link to="/duel" className="btn btn-ghost btn-small" style={{ marginTop: 18 }}>{t("duel.toLobby")}</Link>
        </div>
      </Layout>
    );
  }

  const banner = status === "reconnecting" && <div className="status-line">{t("duel.reconnecting")}</div>;

  if (room.status === "waiting") {
    return <Layout>{banner}<Waiting room={room} me={me} t={t} now={now} offset={clockOffset} onLeave={leave} /></Layout>;
  }

  if (room.status === "countdown") {
    // время берём в момент отрисовки: useNow лишь перерисовывает экран каждые 100 мс
    const left = Math.min(3, Math.max(1, Math.ceil((room.startsAt - (Date.now() + clockOffset)) / 1000)));
    return (
      <Layout>
        <div className="countdown">
          <span className="eyebrow">{t("duel.getReady")}</span>
          <span className="serif-num" data-testid="countdown">{left}</span>
          <span className="muted">{me?.login} vs {opponent?.login} · {settingsLine(room.settings, t)}</span>
        </div>
      </Layout>
    );
  }

  if (room.status === "finished") {
    return <Layout wide>{banner}<Results room={room} me={me} t={t} onRematch={() => send({ type: "rematch" })} /></Layout>;
  }

  // ---------- Гонка ----------
  const live = typing.live;
  const counter = room.text.mode === "time"
    ? (typing.phase === "running" ? typing.remaining : room.text.option)
    : <>{Math.floor(typing.elapsed / 1000)}<small>{t("test.sec")}</small></>;
  const iFinished = me?.finished || typing.phase === "done";

  return (
    <Layout focus={typing.phase === "running"}>
      {banner}
      <Lanes room={room} me={me} t={t} />
      <div className="test-stats" style={{ marginTop: 28 }}>
        <div className="timer">{counter}</div>
        {live && (
          <div className="live">
            <span className="live-item"><span className="num small">{live.accuracy}%</span><span className="unit quiet">{t("test.acc")}</span></span>
            <span className="live-item"><span className="num small">{live.errors}</span><span className="unit quiet">{t("test.err")}</span></span>
            <span className="live-item"><span className="num">{typing.phase === "running" ? live.wpm : 0}</span><span className="unit">{t("test.wpm")}</span></span>
          </div>
        )}
      </div>
      <WordsView target={room.text.text} typed={typing.typed} errorPositions={typing.errorPositions} idle={typing.phase !== "running"} />
      {room.text.author && <div className="author">{room.text.author}</div>}
      <div className="status-line" role="status">
        {typing.phase === "ready" && !iFinished && t("duel.startHint")}
        {iFinished && t("duel.youFinished", { name: opponent?.login || "" })}
        {error && <span className="error-text"> {errorText(error)}</span>}
      </div>
      <div className="test-actions">
        <button className="link-btn" onClick={leave}>{t("duel.leave")}</button>
      </div>
    </Layout>
  );
}
