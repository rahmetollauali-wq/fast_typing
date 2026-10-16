import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState(null);
  const [modes, setModes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(e.message));

    fetch("/api/modes")
      .then((r) => r.json())
      .then(setModes)
      .catch(() => {});
  }, []);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "48px auto", padding: "0 16px" }}>
      <h1>Fast Typing</h1>
      <p>Каркас проекта: frontend → backend → db.</p>

      <h2>Статус системы</h2>
      {error && <p style={{ color: "crimson" }}>Backend недоступен: {error}</p>}
      {!health && !error && <p>Проверяю…</p>}
      {health && (
        <ul>
          <li>Frontend: работает</li>
          <li>Backend: {health.status}</li>
          <li>База данных: {health.db}, таблиц: {health.tables}</li>
        </ul>
      )}

      <h2>Режимы из базы</h2>
      <ul>
        {modes.map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </main>
  );
}
