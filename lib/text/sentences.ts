/**
 * Splits a paragraph into sentences. Used by the browser (highlight while listening)
 * AND the server (one audio file per sentence), so both must cut in exactly the same places.
 *
 * Returns [start, end) ranges that cover the whole paragraph: the spaces after a sentence
 * belong to that sentence, so joining all parts gives back the exact paragraph.
 */

/** Short forms that end with a dot but do not end a sentence. */
const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|St|Sr|Jr|Mt|Capt|Col|Gen|Lt|Prof|Rev|Hon|No|vs|etc|i\.e|e\.g)\.$/i;

export function sentenceRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  const ends = /[.!?…]+["”’)\]]*(?:\s+|$)/g;
  let from = 0;
  for (let m = ends.exec(text); m; m = ends.exec(text)) {
    const to = m.index + m[0].length;
    const next = text[to] ?? "";
    // Not an end: "Mr. Bennet", or speech going on: “Hello!” cried Alice.
    if (ABBREVIATIONS.test(text.slice(Math.max(0, m.index - 5), m.index + 1)) || /[a-z]/.test(next)) continue;
    if (to > from) ranges.push([from, to]);
    from = to;
  }
  if (from < text.length) ranges.push([from, text.length]);
  return ranges;
}

/** The sentences of a paragraph (trimmed). Index i matches sentenceRanges(text)[i]. */
export function splitSentences(text: string): string[] {
  return sentenceRanges(text).map(([a, b]) => text.slice(a, b).trim());
}

/** True if a sentence has something to read aloud (not just "* * *"). */
export function isSpeakable(sentence: string) {
  return /[A-Za-z0-9]/.test(sentence);
}
