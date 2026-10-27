// Метрики для показа во время теста (FR-08). Итоговый результат всегда
// пересчитывает сервер по журналу нажатий — эти цифры только для глаз.
//   WPM      = (верные символы / 5) / время в минутах
//   Точность = верные нажатия / все нажатия × 100%

export function liveMetrics({ typed, target, correctKeys, totalKeys, elapsedMs }) {
  let correctChars = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correctChars++;
  const minutes = Math.max(elapsedMs, 1000) / 60000;
  return {
    wpm: Math.round(correctChars / 5 / minutes),
    accuracy: totalKeys ? Math.round((correctKeys / totalKeys) * 1000) / 10 : 100,
    errors: totalKeys - correctKeys,
  };
}

// Пробелы и переносы → один пробел (так же делает сервер).
export const normalizeText = (s) => String(s || "").replace(/\s+/g, " ").trim();

// Разбивает текст на слова с позицией начала каждого слова.
export function splitWords(text) {
  const words = [];
  let start = 0;
  for (const w of text.split(" ")) {
    words.push({ word: w, start });
    start += w.length + 1;
  }
  return words;
}
