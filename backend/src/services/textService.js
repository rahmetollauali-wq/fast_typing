import * as texts from "../repositories/textRepository.js";
import * as refs from "../repositories/refRepository.js";
import { badRequest, notFound } from "./errors.js";

export const TIME_OPTIONS = [15, 30, 60, 120];
export const WORD_OPTIONS = [10, 25, 50];
export const CUSTOM_MIN = 20;
export const CUSTOM_MAX = 2000;

// Откуда берётся текст для каждого режима.
//   classic, noerror → готовые тексты режима classic
//   quotes           → цитаты
//   words, time      → случайные слова из словаря (тексты режима words)
const SOURCE = { classic: "classic", noerror: "classic", quotes: "quotes", words: "words", time: "words" };

const PUNCT = [",", ".", ";", "?", "!", ":"];
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Пробелы и переносы → один пробел. Так же нормализуется текст на frontend.
export const normalize = (s) => String(s || "").replace(/\s+/g, " ").trim();

export async function resolveRefs({ mode, language, difficulty }) {
  const r = await refs.resolve({ mode, language, difficulty });
  if (!r.mode) throw badRequest("INVALID_MODE", "Неизвестный режим");
  if (!r.language) throw badRequest("INVALID_LANGUAGE", "Неизвестный язык");
  if (!r.difficulty) throw badRequest("INVALID_DIFFICULTY", "Неизвестная сложность");
  return r;
}

export function checkOption(mode, option) {
  if (mode === "time" && !TIME_OPTIONS.includes(option)) {
    throw badRequest("INVALID_OPTION", `Длительность: ${TIME_OPTIONS.join(", ")} с`);
  }
  if (mode === "words" && !WORD_OPTIONS.includes(option)) {
    throw badRequest("INVALID_OPTION", `Количество слов: ${WORD_OPTIONS.join(", ")}`);
  }
}

async function sourceIds(mode, languageId, difficultyId) {
  const { modes } = await refs.getAll();
  const source = modes.find((m) => m.code === SOURCE[mode]);
  return { modeId: source.id, languageId, difficultyId };
}

// На сложном уровне слова иногда пишутся с заглавной, со знаком препинания или числом.
function decorate(word) {
  const r = Math.random();
  if (r < 0.07) return String(Math.floor(Math.random() * 999) + 1);
  let w = word;
  if (Math.random() < 0.15) w = w[0].toUpperCase() + w.slice(1);
  if (Math.random() < 0.18) w += pick(PUNCT);
  return w;
}

function sampleWords(dict, count, hard) {
  const out = [];
  let prev = null;
  while (out.length < count) {
    let w = pick(dict);
    if (w === prev && dict.length > 1) continue; // без повторов подряд
    prev = w;
    out.push(hard ? decorate(w) : w);
  }
  return out;
}

// FR-05: случайный текст из БД по режиму, языку и сложности.
export async function getTextForTest({ mode, language, difficulty, option, excludeId }) {
  if (mode === "custom") throw badRequest("INVALID_MODE", "Свой текст вводит пользователь");
  const r = await resolveRefs({ mode, language, difficulty });
  checkOption(mode, option);
  const ids = await sourceIds(mode, r.language.id, r.difficulty.id);

  if (mode === "words" || mode === "time") {
    const dict = await texts.findDictionary(ids);
    if (!dict.length) throw notFound("Нет словаря для этого языка и сложности");
    // для режима «На время» слов с запасом: ~5 слов на секунду хватает даже на 250 WPM
    const count = mode === "words" ? option : Math.max(60, option * 5);
    const words = sampleWords(dict, count, difficulty === "hard");
    return { mode, language, difficulty, option, textId: null, author: null, text: words.join(" ") };
  }

  const row = await texts.findRandom({ ...ids, excludeId });
  if (!row) throw notFound("Нет текстов для этого режима, языка и сложности");
  return {
    mode, language, difficulty, option: null,
    textId: row.id, author: row.author, text: normalize(row.body),
  };
}

// Проверка, что текст, который печатал клиент, действительно выдан сервером.
// Возвращает textId для сохранения попытки.
export async function verifyTarget({ mode, languageId, difficultyId, option, textId, target }) {
  if (mode === "custom") {
    if (target.length < CUSTOM_MIN) throw badRequest("CUSTOM_TOO_SHORT", `Минимум ${CUSTOM_MIN} символов`);
    if (target.length > CUSTOM_MAX) throw badRequest("CUSTOM_TOO_LONG", `Максимум ${CUSTOM_MAX} символов`);
    return null;
  }

  const ids = await sourceIds(mode, languageId, difficultyId);

  if (mode === "words" || mode === "time") {
    const dict = new Set(await texts.findDictionary(ids));
    const words = target.split(" ");
    if (mode === "words" && words.length !== option) {
      throw badRequest("TEXT_MISMATCH", "Количество слов не совпадает с режимом");
    }
    for (const w of words) {
      const bare = w.replace(/[.,;:?!]+$/, "");
      if (/^\d+$/.test(bare)) continue;
      const lower = bare.length ? bare[0].toLowerCase() + bare.slice(1) : bare;
      if (!dict.has(lower)) throw badRequest("TEXT_MISMATCH", "Текст не из словаря");
    }
    return null;
  }

  const row = await texts.findById(Number(textId));
  if (!row || row.mode_id !== ids.modeId || row.language_id !== languageId || row.difficulty_id !== difficultyId) {
    throw badRequest("TEXT_MISMATCH", "Текст не найден для этого режима");
  }
  if (normalize(row.body) !== target) throw badRequest("TEXT_MISMATCH", "Текст не совпадает с выданным");
  return row.id;
}
