import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { storage } from "../lib/storage.js";

// Настройки теста: режим, длительность/число слов, язык текста, сложность.
export const MODES = ["classic", "time", "words", "quotes", "noerror", "custom"];
export const OPTIONS = { time: [15, 30, 60, 120], words: [10, 25, 50] };
export const LANGUAGES = ["en", "ru"];
export const DIFFICULTIES = ["easy", "medium", "hard"];
export const CUSTOM_MIN = 20;
export const CUSTOM_MAX = 2000;

const THEMES = ["dark", "newyear"];
const normalizeTheme = (theme) => (THEMES.includes(theme) ? theme : "dark");
const DEFAULTS = { mode: "time", timeOption: 30, wordsOption: 25, language: "en", difficulty: "medium", theme: "dark" };

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const saved = storage.getJSON("settings", {});
    const safe = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    return { ...DEFAULTS, ...safe, theme: normalizeTheme(safe.theme) };
  });

  // Тема применяется до отрисовки, чтобы не было вспышки старой палитры.
  useLayoutEffect(() => {
    const theme = normalizeTheme(settings.theme);
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "newyear" ? "#071a16" : "#111113";
  }, [settings.theme]);

  useEffect(() => storage.setJSON("settings", settings), [settings]);

  const update = useCallback((patch) => setSettings((s) => ({ ...s, ...patch })), []);

  const option = settings.mode === "time" ? settings.timeOption : settings.mode === "words" ? settings.wordsOption : null;

  const value = useMemo(() => ({ ...settings, option, update }), [settings, option, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
