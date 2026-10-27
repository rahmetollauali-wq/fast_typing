// Модульные тесты формул из раздела 7.1 ТЗ. Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { replay, calculate } from "../src/services/metrics.js";

const keys = (s, step = 100) => [...s].map((k, i) => ({ t: i * step, k }));

test("QS: 60 WPM при точности 90% дают 48,6 (пример из ТЗ)", () => {
  // 300 верных символов за 60 с = 60 WPM; 300 из 333,33 нажатий ≈ 90%
  const m = calculate({ correctChars: 300, typedChars: 300, correctKeys: 9, totalKeys: 10, durationMs: 60000 });
  assert.equal(m.wpm, 60);
  assert.equal(m.accuracy, 90);
  assert.equal(m.qualityScore, 48.6);
});

test("TC-04: 10 символов, из них 2 с ошибкой → точность 80%", () => {
  const target = "abcdefghij";
  const r = replay(target, keys("abXdefYhij"));
  assert.equal(r.totalKeys, 10);
  assert.equal(r.errors, 2);
  const m = calculate({ correctChars: r.correctChars, typedChars: r.typed.length, correctKeys: r.correctKeys, totalKeys: r.totalKeys, durationMs: 5000 });
  assert.equal(m.accuracy, 80);
});

test("TC-05: 300 символов верно за 60 с → WPM 60, точность 100%, QS 60", () => {
  const target = "a".repeat(300);
  const r = replay(target, keys(target, 200)); // последнее нажатие на 59,8 с
  assert.ok(r.finished);
  const m = calculate({ correctChars: r.correctChars, typedChars: r.typed.length, correctKeys: r.correctKeys, totalKeys: r.totalKeys, durationMs: 60000 });
  assert.equal(m.wpm, 60);
  assert.equal(m.accuracy, 100);
  assert.equal(m.qualityScore, 60);
});

test("Исправленная через Backspace ошибка всё равно снижает точность", () => {
  const r = replay("cat", [
    { t: 0, k: "c" }, { t: 100, k: "x" }, { t: 200, k: "Backspace" }, { t: 300, k: "a" }, { t: 400, k: "t" },
  ]);
  assert.equal(r.typed, "cat");
  assert.equal(r.correctChars, 3);
  assert.equal(r.totalKeys, 4);
  assert.equal(r.errors, 1);
  assert.deepEqual(r.errorPositions, [1]);
});

test("Backspace не возвращает в уже законченное слово", () => {
  const r = replay("ab cd", keys("ab ") .concat([{ t: 400, k: "Backspace" }]));
  assert.equal(r.typed, "ab ");
});

test("Режим «Без ошибок»: тест останавливается на первой ошибке", () => {
  const r = replay("hello", keys("heXlo"), { stopOnError: true });
  assert.equal(r.typed, "heX");
  assert.ok(r.stoppedByError);
});
