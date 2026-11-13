import type { Level } from "./types";

/**
 * Turns a Flesch "reading ease" score (0-100, higher = easier) into a CEFR level.
 * Old classic books use harder words than the score shows, so the scale is a bit strict.
 */
export function levelFromReadingEase(score: number): Level {
  if (score >= 90) return "A2";
  if (score >= 82) return "B1";
  if (score >= 70) return "B2";
  if (score >= 55) return "C1";
  return "C2";
}

/** Counts syllables in one word (a simple, good-enough rule). */
function syllables(word: string) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

/** Flesch reading ease of a text sample (uses the first ~20,000 characters). */
export function readingEase(text: string) {
  const sample = text.slice(0, 20000);
  const words: string[] = sample.match(/[A-Za-z’']+/g) ?? [];
  const sentences = Math.max(1, (sample.match(/[.!?]+(\s|$)/g) ?? []).length);
  if (words.length < 50) return 70;
  const syl = words.reduce((sum, w) => sum + syllables(w), 0);
  return 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syl / words.length);
}

/** Level of a whole book, measured on text from its middle (skips prefaces). */
export function levelFromChapters(chapters: { content: string }[]): Level {
  const start = Math.floor(chapters.length / 3);
  let sample = "";
  for (let i = start; i < chapters.length && sample.length < 20000; i++) sample += chapters[i].content + "\n\n";
  return levelFromReadingEase(readingEase(sample));
}

/** Quick level guess from Gutenberg subjects, before we have the text. */
export function guessLevelFromSubjects(subjects: string[]): Level | null {
  const s = subjects.join(" ").toLowerCase();
  if (/fables|fairy tales|nursery|picture books/.test(s)) return "A2";
  if (/juvenile|children/.test(s)) return "B1";
  if (/short stories|detective|adventure/.test(s)) return "B2";
  if (s) return "C1";
  return null;
}

/** Simple genre name from Gutenberg subjects / bookshelves. */
export function genreFromSubjects(subjects: string[]): string | null {
  const s = subjects.join(" ").toLowerCase();
  const rules: [RegExp, string][] = [
    [/fables|fairy tales|folklore|legends/, "Fairy tales"],
    [/detective|mystery|crime/, "Mystery"],
    [/science fiction/, "Sci-fi"],
    [/horror|ghost/, "Horror"],
    [/love stories|courtship|romance/, "Romance"],
    [/adventure|pirates|sea stories|voyages/, "Adventure"],
    [/humor|humorous/, "Humor"],
    [/short stories/, "Short stories"],
    [/juvenile|children/, "Children"],
    [/biography|autobiography/, "Biography"],
    [/poetry|poems/, "Poetry"],
  ];
  for (const [re, name] of rules) if (re.test(s)) return name;
  return subjects.length ? "Classic" : null;
}

/** Reading speed for learners: about 150 words per minute. */
export function readingMinutes(words: number) {
  return Math.max(1, Math.round(words / 150));
}

/** Length group for the Library filter. */
export function lengthGroup(words: number): "short" | "medium" | "long" {
  const min = readingMinutes(words);
  if (min <= 60) return "short";
  if (min <= 300) return "medium";
  return "long";
}

/** "2 h 30 min" style text. */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
