/**
 * Compares the sentence I had to say with what the speech-to-text heard.
 * Works on words (not sounds), so it is practice feedback, not an exact accent score.
 *
 * Both texts are normalised first: small letters, no punctuation, "I'm" = "I am",
 * "2" = "two". Then the words are lined up (like a spell checker does) to find
 * words that are right, almost right, wrong (said differently) or missed.
 */

export type WordResult = {
  /** The word as written in the sentence (with punctuation). */
  text: string;
  status: "ok" | "almost" | "wrong" | "missed";
  /** What was heard instead (for "almost" / "wrong"). */
  heard?: string;
};

export type Comparison = {
  words: WordResult[];
  /** Words I said that are not in the sentence. */
  extra: string[];
  /** 0-100 */
  score: number;
};

const PRONOUN_IS = new Set(["it", "that", "what", "he", "she", "there", "here", "who", "where", "how", "let"]);

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberWords(n: number): string[] {
  if (n < 20) return [ONES[n]];
  if (n < 100) return n % 10 ? [TENS[Math.floor(n / 10)], ONES[n % 10]] : [TENS[n / 10]];
  return [String(n)];
}

/** One written word → its normalised token(s): "I'm" → ["i", "am"], "2" → ["two"]. */
export function normalizeWord(word: string): string[] {
  let w = word.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9'\-]/g, "");
  w = w.replace(/^'+|'+$/g, "");
  if (!w) return [];
  if (/^\d+$/.test(w)) return numberWords(Number(w));
  if (w.includes("-")) return w.split("-").flatMap(normalizeWord);
  if (w === "can't" || w === "cannot") return ["can", "not"];
  if (w === "won't") return ["will", "not"];
  if (w === "let's" || w === "lets") return ["lets"]; // speech-to-text often writes "lets"
  let m = w.match(/^(.+)n't$/);
  if (m) return [m[1], "not"];
  m = w.match(/^(.+)'(re|ve|ll|m|d)$/);
  if (m) return [m[1], { re: "are", ve: "have", ll: "will", m: "am", d: "would" }[m[2]]!];
  m = w.match(/^(.+)'s$/);
  if (m && PRONOUN_IS.has(m[1])) return [m[1], "is"];
  return [w.replace(/'/g, "")];
}

/** Letters that differ between two words (Levenshtein distance). */
function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

/** Same word, said a little differently ("colour"/"color", "walk"/"walks"). */
function isAlmost(a: string, b: string) {
  if (a.length < 3 || b.length < 3) return false;
  const d = distance(a, b);
  return d === 1 || (d === 2 && Math.min(a.length, b.length) >= 7);
}

type Token = { norm: string; display: number };

export function compareSpeech(target: string, heard: string): Comparison {
  const displayWords = target.split(/\s+/).filter(Boolean);
  const want: Token[] = displayWords.flatMap((w, i) => normalizeWord(w).map((norm) => ({ norm, display: i })));
  const got = heard.split(/\s+/).flatMap(normalizeWord);

  // Line up the two word lists (edit distance; "almost" counts as a cheap match).
  const n = want.length;
  const m = got.length;
  const cost = (i: number, j: number) => (want[i].norm === got[j] ? 0 : isAlmost(want[i].norm, got[j]) ? 0.4 : 1);
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost(i - 1, j - 1));
    }
  }

  // Walk back to see what happened to each word.
  const tokenStatus: { status: WordResult["status"]; heard?: string }[] = new Array(n);
  const extra: string[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost(i - 1, j - 1)) {
      const c = cost(i - 1, j - 1);
      tokenStatus[i - 1] = c === 0 ? { status: "ok" } : { status: c < 1 ? "almost" : "wrong", heard: got[j - 1] };
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      tokenStatus[i - 1] = { status: "missed" };
      i--;
    } else {
      extra.unshift(got[j - 1]);
      j--;
    }
  }

  // Back to the written words: a word is as bad as its worst part ("I'm" = "i" + "am"),
  // but a short form that was half said ("I" for "I'm") is only "almost".
  const rank = { ok: 0, almost: 1, wrong: 2, missed: 3 } as const;
  const words: WordResult[] = displayWords.map((text) => ({ text, status: "ok" as WordResult["status"] }));
  const partSaid = new Set<number>();
  want.forEach((t, k) => {
    const s = tokenStatus[k];
    if (s.status === "ok" || s.status === "almost") partSaid.add(t.display);
    const w = words[t.display];
    if (rank[s.status] > rank[w.status]) {
      w.status = s.status;
      w.heard = s.heard;
    }
  });
  words.forEach((w, idx) => {
    if (w.status === "missed" && partSaid.has(idx)) w.status = "almost";
  });
  // Words that are only punctuation ("—") count as fine.
  const counted = words.filter((_, idx) => want.some((t) => t.display === idx));
  const points = counted.reduce((sum, w) => sum + (w.status === "ok" ? 1 : w.status === "almost" ? 0.6 : 0), 0);
  const score = counted.length ? Math.round((points / counted.length) * 100) : 0;
  return { words, extra, score };
}
