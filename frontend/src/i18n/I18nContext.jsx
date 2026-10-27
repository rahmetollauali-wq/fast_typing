import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STRINGS } from "./strings.js";
import { storage } from "../lib/storage.js";

const I18nContext = createContext(null);

function initialLang() {
  const saved = storage.get("ui-lang");
  if (saved === "ru" || saved === "en") return saved;
  return navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    storage.set("ui-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useCallback(
    (key, vars = {}) => {
      const str = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
      return str.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`));
    },
    [lang]
  );

  // Ошибка API → понятный текст на текущем языке
  const errorText = useCallback(
    (err) => {
      const code = err?.code;
      if (code && STRINGS[lang][`err.${code}`]) return t(`err.${code}`);
      return err?.message || t("err.default");
    },
    [lang, t]
  );

  const value = useMemo(() => ({ lang, setLang, t, errorText }), [lang, t, errorText]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
