import * as texts from "../repositories/textRepository.js";
import * as refs from "../repositories/refRepository.js";
import { badRequest, notFound } from "./errors.js";
import { normalize } from "./textService.js";

const EDITABLE_MODES = ["classic", "quotes", "words"];

async function idsFromCodes({ mode, language, difficulty }) {
  const all = await refs.getAll();
  const find = (list, code) => (code ? list.find((x) => x.code === code)?.id ?? -1 : null);
  return {
    modeId: find(all.modes, mode),
    languageId: find(all.languages, language),
    difficultyId: find(all.difficulties, difficulty),
  };
}

export async function listTexts(filters) {
  return texts.list(await idsFromCodes(filters));
}

// FR-16: администратор добавляет текст.
export async function createText({ mode, language, difficulty, body, author }) {
  if (!EDITABLE_MODES.includes(mode)) {
    throw badRequest("INVALID_MODE", "Тексты добавляются для режимов classic, quotes и words");
  }
  const ids = await idsFromCodes({ mode, language, difficulty });
  if (!ids.languageId || ids.languageId < 0) throw badRequest("INVALID_LANGUAGE", "Неизвестный язык");
  if (!ids.difficultyId || ids.difficultyId < 0) throw badRequest("INVALID_DIFFICULTY", "Неизвестная сложность");
  const clean = normalize(body);
  if (clean.length < 10 || clean.length > 5000) {
    throw badRequest("INVALID_TEXT", "Текст: от 10 до 5000 символов");
  }
  return texts.create({ ...ids, body: clean, author: String(author || "").trim().slice(0, 100) });
}

// FR-16: удаление. Если по тексту уже есть попытки, он только скрывается,
// чтобы не потерять историю пользователей.
export async function deleteText(id) {
  const text = await texts.findById(Number(id));
  if (!text) throw notFound("Текст не найден");
  if (await texts.isUsedInAttempts(text.id)) {
    await texts.setActive(text.id, false);
    return { id: text.id, deleted: false, deactivated: true };
  }
  await texts.remove(text.id);
  return { id: text.id, deleted: true, deactivated: false };
}

export async function restoreText(id) {
  const text = await texts.findById(Number(id));
  if (!text) throw notFound("Текст не найден");
  await texts.setActive(text.id, true);
  return { id: text.id, restored: true };
}
