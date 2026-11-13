/** Multiple-choice questions (AI stories, chapter checks). Shared by server and browser. */

export type QuizQuestion = {
  question: string;
  options: string[]; // 3-4 answers
  answer: number; // index of the right answer
  explanation: string; // one short line
};

export type KeyWord = { word: string; meaning: string; example: string };

/** JSON schema parts for the AI. */
export const QUESTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["question", "options", "answer", "explanation"],
  properties: {
    question: { type: "string" },
    // 3-4 options; "answer" = index of the right one (checked in cleanQuestions, because
    // not every model supports minItems/minimum in strict schemas).
    options: { type: "array", items: { type: "string" } },
    answer: { type: "integer" },
    explanation: { type: "string" },
  },
} as const;

export const KEY_WORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["word", "meaning", "example"],
  properties: { word: { type: "string" }, meaning: { type: "string" }, example: { type: "string" } },
} as const;

/** Keeps only well-formed questions (the AI is usually right, but we check). */
export function cleanQuestions(list: unknown): QuizQuestion[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(
      (q): q is QuizQuestion =>
        typeof q?.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        Number.isInteger(q.answer) &&
        q.answer >= 0 &&
        q.answer < q.options.length,
    )
    .slice(0, 5);
}

export function cleanKeyWords(list: unknown): KeyWord[] {
  if (!Array.isArray(list)) return [];
  return list.filter((k): k is KeyWord => typeof k?.word === "string" && typeof k?.meaning === "string").slice(0, 8);
}
