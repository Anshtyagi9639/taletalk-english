/** Browser helpers for the Reader: find the word under a tap, and its sentence. */

import { sentenceRanges } from "@/lib/text/sentences";

const WORD_CHAR = /[A-Za-z'’-]/;

type CaretDoc = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/** The text position under the screen point (x, y). */
function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as CaretDoc;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    return r ? { node: r.startContainer, offset: r.startOffset } : null;
  }
  return null;
}

/**
 * The word the user tapped at (x, y) inside `root`, plus the sentence around it.
 * Returns null for taps on empty space or punctuation.
 */
export function wordAtPoint(x: number, y: number, root: HTMLElement): { word: string; sentence: string } | null {
  const caret = caretAt(x, y);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE || !root.contains(caret.node)) return null;
  const text = caret.node.textContent ?? "";

  let start = caret.offset;
  // The caret can sit just after the last letter of the word.
  if (!WORD_CHAR.test(text[start] ?? "") && start > 0 && WORD_CHAR.test(text[start - 1])) start -= 1;
  if (!WORD_CHAR.test(text[start] ?? "")) return null;
  let end = start;
  while (start > 0 && WORD_CHAR.test(text[start - 1])) start--;
  while (end < text.length && WORD_CHAR.test(text[end])) end++;

  // Check the tap is really on the word (not in the margin next to it).
  const range = document.createRange();
  range.setStart(caret.node, start);
  range.setEnd(caret.node, end);
  const hit = [...range.getClientRects()].some(
    (r) => x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 4 && y <= r.bottom + 4,
  );
  if (!hit) return null;

  const word = text
    .slice(start, end)
    .replace(/^['’-]+|['’-]+$/g, "")
    .replace(/['’]s$/i, ""); // "Alice’s" → "Alice"
  if (!/[A-Za-z]{1,}/.test(word)) return null;

  return { word, sentence: sentenceAround(text, start) };
}

/** The sentence in `text` that contains character `index`. */
export function sentenceAround(text: string, index: number) {
  const range = sentenceRanges(text).find(([, end]) => index < end);
  return range ? text.slice(range[0], range[1]).trim() : text.trim();
}
