// Расчёт метрик по журналу нажатий (раздел 7.1 ТЗ).
//
//   WPM      = (верные символы / 5) / время в минутах
//   Точность = верные нажатия / все нажатия × 100%
//   QS       = WPM × (Точность / 100)²
//
// Журнал: [{ t, k }], где t — мс от первого нажатия, k — символ или "Backspace".
// Курсор движется только вперёд; ошибочный символ тоже занимает позицию.
// Backspace удаляет последний символ, но не возвращает в уже законченное слово.
// Ошибка, исправленная через Backspace, всё равно остаётся в точности.

export const MIN_DURATION_MS = 1000;

const round = (n, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

export function replay(target, keystrokes, { stopOnError = false } = {}) {
  const typed = [];
  const errorPositions = new Set(); // позиции, где хоть раз была ошибка
  const errorTimes = [];
  const correctTimes = [];
  let totalKeys = 0;
  let correctKeys = 0;
  let stoppedByError = false;

  for (const { t, k } of keystrokes) {
    if (k === "Backspace") {
      const last = typed.length - 1;
      if (last < 0) continue;
      // нельзя вернуться в слово, после которого уже верно напечатан пробел
      if (typed[last] === " " && target[last] === " ") continue;
      typed.pop();
      continue;
    }
    if (typeof k !== "string" || k.length !== 1) continue;
    if (typed.length >= target.length) break;

    const pos = typed.length;
    const ok = k === target[pos];
    typed.push(k);
    totalKeys += 1;
    if (ok) {
      correctKeys += 1;
      correctTimes.push(t);
    } else {
      errorPositions.add(pos);
      errorTimes.push(t);
      if (stopOnError) {
        stoppedByError = true;
        break;
      }
    }
  }

  let correctChars = 0;
  for (let i = 0; i < typed.length; i++) if (typed[i] === target[i]) correctChars += 1;

  return {
    typed: typed.join(""),
    totalKeys,
    correctKeys,
    errors: totalKeys - correctKeys,
    correctChars,
    errorPositions: [...errorPositions].sort((a, b) => a - b),
    errorTimes,
    correctTimes,
    stoppedByError,
    finished: typed.length === target.length,
  };
}

export function calculate({ correctChars, typedChars, correctKeys, totalKeys, durationMs }) {
  const minutes = Math.max(durationMs, MIN_DURATION_MS) / 60000;
  const wpm = correctChars / 5 / minutes;
  const rawWpm = typedChars / 5 / minutes;
  const accuracy = totalKeys > 0 ? (correctKeys / totalKeys) * 100 : 0;
  const qualityScore = wpm * (accuracy / 100) ** 2;
  return {
    wpm: round(wpm),
    rawWpm: round(rawWpm),
    accuracy: round(accuracy),
    qualityScore: round(qualityScore),
  };
}

// Скорость по секундам для графика: верные нажатия в скользящем окне 3 с.
export function paceSeries(correctTimes, errorTimes, durationMs) {
  const seconds = Math.max(1, Math.ceil(durationMs / 1000));
  const points = [];
  for (let s = 1; s <= seconds; s++) {
    const end = s * 1000;
    const window = Math.min(3, s) * 1000;
    const count = correctTimes.filter((t) => t > end - window && t <= end).length;
    const errors = errorTimes.filter((t) => t > end - 1000 && t <= end).length;
    points.push({ second: s, wpm: round(count / 5 / (window / 60000), 1), errors });
  }
  return points;
}

// Буквы и слова, в которых были ошибки, — для подсказки «A note for next time».
export function errorSummary(target, errorPositions) {
  const letters = {};
  const words = new Set();
  for (const pos of errorPositions) {
    const ch = target[pos];
    if (ch === " ") {
      letters["␣"] = (letters["␣"] || 0) + 1;
      continue;
    }
    letters[ch] = (letters[ch] || 0) + 1;
    let start = pos;
    let end = pos;
    while (start > 0 && target[start - 1] !== " ") start--;
    while (end < target.length && target[end] !== " ") end++;
    words.add(`${start}:${target.slice(start, end)}`);
  }
  const topLetters = Object.entries(letters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([letter, count]) => ({ letter, count }));
  const wordList = [...words].slice(0, 6).map((w) => {
    const i = w.indexOf(":");
    return { start: Number(w.slice(0, i)), word: w.slice(i + 1) };
  });
  return { letters: topLetters, words: wordList };
}
