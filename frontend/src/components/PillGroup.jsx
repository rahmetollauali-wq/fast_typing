// Группа «пилюль» как на макете: один выбранный вариант подсвечен.
export function PillGroup({ children, label }) {
  return <div className="pill-group" role="group" aria-label={label}>{children}</div>;
}

export function Pill({ on, onClick, children, title }) {
  return (
    <button type="button" className={`pill${on ? " on" : ""}`} onClick={onClick} aria-pressed={on} title={title}>
      {children}
    </button>
  );
}

export const PillSep = () => <span className="pill-sep" aria-hidden="true" />;
