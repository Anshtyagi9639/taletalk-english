import "server-only";
import type { Level } from "@/lib/books/types";
import { PLACEMENT_QUESTIONS } from "./questions";

/** Right answer (option index) for each placement question, in the same order. Server only. */
const ANSWERS = [1, 0, 1, 0, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1];

const ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"];

/**
 * My level = the highest level where I got at least 3 of 4 right, AND at least 75% right
 * from A1 up to that level (so one careless slip on an easy question does not pull me down,
 * but lucky guesses on hard ones with many easy mistakes do not push me up). Nothing passed → A1.
 */
export function scorePlacement(answers: (number | null)[]) {
  const perLevel = ORDER.map((level) => {
    const idx = PLACEMENT_QUESTIONS.map((q, i) => (q.level === level ? i : -1)).filter((i) => i >= 0);
    return { level, right: idx.filter((i) => answers[i] === ANSWERS[i]).length, total: idx.length };
  });
  let level: Level = "A1";
  let rightSoFar = 0;
  let totalSoFar = 0;
  for (const r of perLevel) {
    rightSoFar += r.right;
    totalSoFar += r.total;
    if (r.right >= 3 && rightSoFar >= totalSoFar * 0.75) level = r.level;
  }
  const right = perLevel.reduce((s, r) => s + r.right, 0);
  return { level, right, total: ANSWERS.length, perLevel };
}
