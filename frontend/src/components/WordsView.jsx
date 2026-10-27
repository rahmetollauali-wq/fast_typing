import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { splitWords } from "../lib/metrics.js";

const VISIBLE_LINES = 4;

// Одно слово с завершающим пробелом. Перерисовывается, только если
// изменилась его часть набранного текста — так подсветка остаётся быстрой (NFR-01).
const Word = memo(function Word({ word, typedSlice, caretIndex, hasError, isLast }) {
  const chars = isLast ? word : `${word} `;
  return (
    <span className={`word${hasError ? " has-error" : ""}`} data-word>
      {[...chars].map((ch, i) => {
        const typed = typedSlice[i];
        let cls = "ch";
        if (typed !== undefined) cls += typed === ch ? " ok" : ` bad${ch === " " ? " space" : ""}`;
        if (i === caretIndex) cls += " caret";
        return (
          <span key={i} className={cls} data-caret={i === caretIndex ? "" : undefined}>
            {ch}
          </span>
        );
      })}
    </span>
  );
});

// Текст теста: верные символы — светлые, ошибки — оранжевые с подчёркиванием,
// остаток — тусклый, каретка — перед текущим символом (FR-07).
export function WordsView({ target, typed, errorPositions, idle }) {
  const words = useMemo(() => splitWords(target), [target]);
  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [lineHeight, setLineHeight] = useState(75);
  const [offset, setOffset] = useState(0);

  // слова, в которых была ошибка (подчёркиваются после того, как слово пройдено)
  const errorWords = useMemo(() => {
    const set = new Set();
    for (const pos of errorPositions) {
      let lo = 0;
      let hi = words.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (words[mid].start <= pos) lo = mid;
        else hi = mid - 1;
      }
      set.add(lo);
    }
    return set;
  }, [errorPositions, words]);

  useLayoutEffect(() => {
    const measure = () => {
      if (innerRef.current) setLineHeight(parseFloat(getComputedStyle(innerRef.current).lineHeight) || 75);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Прокрутка: текущая строка всегда вторая сверху.
  useLayoutEffect(() => {
    const caret = innerRef.current?.querySelector("[data-caret]");
    if (!caret) return;
    const word = caret.closest("[data-word]");
    const line = Math.round(word.offsetTop / lineHeight);
    setOffset(Math.max(0, line - 1) * lineHeight);
  }, [typed, lineHeight, target]);

  return (
    <div className={`words-window${idle ? " idle" : ""}`} ref={wrapRef} style={{ height: lineHeight * VISIBLE_LINES }}>
      <div className="words" ref={innerRef} style={{ transform: `translateY(-${offset}px)` }}>
        {words.map(({ word, start }, i) => {
          const end = start + word.length + 1;
          const caret = typed.length >= start && typed.length < end ? typed.length - start : -1;
          return (
            <Word
              key={i}
              word={word}
              typedSlice={typed.length > start ? typed.slice(start, end) : ""}
              caretIndex={caret}
              hasError={errorWords.has(i) && typed.length >= end}
              isLast={i === words.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}
