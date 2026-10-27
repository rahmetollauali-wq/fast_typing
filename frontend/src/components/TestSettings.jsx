import { useI18n } from "../i18n/I18nContext.jsx";
import { DIFFICULTIES, LANGUAGES, MODES, OPTIONS, useSettings } from "../context/SettingsContext.jsx";
import { Pill, PillGroup, PillSep } from "./PillGroup.jsx";
import { Clock } from "./Icons.jsx";

// Панель настроек над текстом: режим, длительность/число слов, язык, сложность (FR-03, FR-04).
export function TestSettings() {
  const { t } = useI18n();
  const s = useSettings();
  const options = OPTIONS[s.mode];

  const setOption = (value) => s.update(s.mode === "time" ? { timeOption: value } : { wordsOption: value });

  return (
    <div className="settings">
      <PillGroup label="mode">
        {MODES.map((m) => (
          <Pill key={m} on={s.mode === m} onClick={() => s.update({ mode: m })}>{t(`mode.${m}`)}</Pill>
        ))}
      </PillGroup>
      <PillGroup label="options">
        {options && (
          <>
            <span className="pill-icon">{s.mode === "time" ? <Clock /> : "#"}</span>
            {options.map((o) => (
              <Pill key={o} on={s.option === o} onClick={() => setOption(o)}>{o}</Pill>
            ))}
            <PillSep />
          </>
        )}
        {LANGUAGES.map((l) => (
          <Pill key={l} on={s.language === l} onClick={() => s.update({ language: l })}>{l}</Pill>
        ))}
        <PillSep />
        {DIFFICULTIES.map((d) => (
          <Pill key={d} on={s.difficulty === d} onClick={() => s.update({ difficulty: d })}>{t(`diff.${d}`)}</Pill>
        ))}
      </PillGroup>
    </div>
  );
}
