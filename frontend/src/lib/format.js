// Форматирование чисел и дат.
export const fmt = (n, digits = 0) =>
  Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const int = (n) => Math.round(Number(n ?? 0));

export function duration(ms) {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function hours(ms, lang) {
  const min = Math.round(ms / 60000);
  if (min < 60) return lang === "ru" ? `${min} мин` : `${min} min`;
  const h = (min / 60).toFixed(1);
  return lang === "ru" ? `${h} ч` : `${h} h`;
}

const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

export function relativeTime(date, lang) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return lang === "ru" ? "только что" : "just now";
}

export const shortDate = (date, lang) =>
  new Date(date).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const pad2 = (n) => String(n).padStart(2, "0");
