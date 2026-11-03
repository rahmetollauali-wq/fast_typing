import { useMemo } from "react";
import { useSettings } from "../context/SettingsContext.jsx";

// Новогодние украшения рисуются только поверх новогодней темы.
// Все элементы декоративные: aria-hidden и pointer-events: none.

export function SantaHat({ size = 30, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size * 0.82}
      viewBox="0 0 44 36"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 27C8 16 15 9 25 7c5-1 10 1 13 5-5 1-8 4-10 9-2 4-4 6-6 6H6z"
        fill="#c0392b"
        stroke="#7f1d1d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="4" y="26" width="36" height="7" rx="3.5" fill="#f8edd6" stroke="#d8c7a8" strokeWidth="1" />
      <circle cx="38" cy="8" r="4" fill="#f8edd6" stroke="#d8c7a8" strokeWidth="1" />
    </svg>
  );
}

function Stocking({ color = "#c0392b", size = 38 }) {
  return (
    <svg width={size} height={size * 1.42} viewBox="0 0 48 68" fill="none" aria-hidden="true">
      <path
        d="M13 16h22v22c0 8-4.5 14-12.5 17C14.5 52 10 46 10 38V16z"
        fill={color}
        stroke="#7f1d1d"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="9" y="15" width="30" height="10" rx="2" fill="#f8edd6" stroke="#d8c7a8" strokeWidth="1" />
      <path d="M24 15V7c0-4 7-4 7 0" stroke="#2a574a" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 31v13M17.5 37.5h13M19 32.5l10 10M29 32.5l-10 10" stroke="#f8edd6" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
      <path d="M15 43c5 4 13 4 18 0" stroke="#f8edd6" strokeWidth="2" strokeLinecap="round" opacity=".65" />
    </svg>
  );
}

function Gift({ color = "#e7b95f", size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="5" y="12" width="30" height="24" rx="3" fill={color} />
      <rect x="5" y="12" width="30" height="7" fill="#f8edd6" opacity=".92" />
      <path d="M20 12v24M5 21h30" stroke="#f8edd6" strokeWidth="2" />
      <path d="M20 12c-6-8-14-2-8 3 3 2 8-1 8-3zM20 12c6-8 14-2 8 3-3 2-8-1-8-3z" fill="#f8edd6" />
    </svg>
  );
}

function Snowfall() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 120 }, () => ({
        left: `${Math.random() * 100}%`,
        size: `${2 + Math.random() * 5}px`,
        delay: `${-Math.random() * 18}s`,
        duration: `${7 + Math.random() * 10}s`,
        drift: `${-40 + Math.random() * 80}px`,
        opacity: 0.35 + Math.random() * 0.55,
      })),
    []
  );

  return (
    <div className="snowfall" aria-hidden="true">
      {flakes.map((flake, i) => (
        <span
          key={i}
          className="snowflake"
          style={{
            left: flake.left,
            width: flake.size,
            height: flake.size,
            animationDelay: flake.delay,
            animationDuration: flake.duration,
            "--drift": flake.drift,
            "--flake-opacity": flake.opacity,
          }}
        />
      ))}
    </div>
  );
}

const BULB_COLORS = ["#e7b95f", "#ff6f61", "#9fd8b6", "#8fc7e8"];

function Garland() {
  const bulbs = Array.from({ length: 26 }, (_, i) => {
    const t = (i + 0.5) / 26;
    return {
      left: t * 100,
      top: 2 + 40 * t * (1 - t),
    };
  });

  return (
    <div className="garland" aria-hidden="true">
      <svg className="garland-wire" viewBox="0 0 100 22" preserveAspectRatio="none">
        <path d="M0 2 Q50 22 100 2" />
      </svg>
      {bulbs.map((bulb, i) => (
        <span
          key={i}
          className="garland-bulb"
          style={{
            left: `${bulb.left}%`,
            top: `${bulb.top}px`,
            "--bulb": BULB_COLORS[i % BULB_COLORS.length],
            animationDelay: `${(i % 7) * 0.24}s`,
          }}
        />
      ))}
    </div>
  );
}

function Stockings() {
  return (
    <>
      <div className="holiday-stockings holiday-stockings--left" aria-hidden="true">
        <Stocking color="#c0392b" size={40} />
        <Stocking color="#2f6b57" size={36} />
        <Gift color="#e7b95f" size={26} />
      </div>
      <div className="holiday-stockings holiday-stockings--right" aria-hidden="true">
        <Gift color="#ff6f61" size={26} />
        <Stocking color="#8f3b4d" size={36} />
        <Stocking color="#c0392b" size={40} />
      </div>
    </>
  );
}

export function HolidayDecor() {
  const { theme } = useSettings();
  if (theme !== "newyear") return null;

  return (
    <>
      <Snowfall />
      <Garland />
      <Stockings />
    </>
  );
}
