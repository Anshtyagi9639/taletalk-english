import type { ChapterDraft } from "./types";

/**
 * Splits a whole book into chapters (or stories / parts).
 *
 * We try two ways to find headings and keep the one that finds more real chapters:
 *  1. Heading lines: "CHAPTER I", "Chapter 2. Title", "I. A SCANDAL IN BOHEMIA", a bare "IV".
 *  2. The book's "Contents" list: each title is then searched for in the text
 *     (good for story collections like Grimm, Aesop and O. Henry).
 * If both fail, the book is cut into parts of about 2,500 words.
 * Very long chapters are cut into smaller parts so the reader and the AI get small pieces.
 */

/** A section must have this much text to count as a real chapter (TOC lines have ~0). */
const MIN_SECTION_CHARS = 250;
/** Front matter shorter than this (title page, contents) is dropped. */
const MIN_INTRO_CHARS = 1500;
/** Longer chapters are split into equal parts (about 30 minutes of reading each). */
const MAX_CHAPTER_WORDS = 5000;
/** Part size when the book has no headings at all. */
const FALLBACK_PART_WORDS = 2500;
const MAX_CHAPTERS = 800;

type Heading = { line: number; title: string; /** lines used by the heading itself */ size: number };
type Section = { title: string; lines: string[] };

export function splitIntoChapters(text: string): ChapterDraft[] {
  const lines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
  const totalChars = countChars(lines);

  let best: Section[] | null = null;
  for (const heads of [findHeadingLines(lines), findContentsHeadings(lines)]) {
    const sections = buildSections(lines, heads);
    const covered = sections.reduce((sum, s) => sum + countChars(s.lines), 0);
    const good = sections.length >= 3 && covered >= totalChars * 0.5;
    if (good && (!best || sections.length > best.length)) best = sections;
  }

  const drafts: ChapterDraft[] = [];
  if (best) {
    for (const s of best) {
      if (/^index$/i.test(s.title)) continue; // a word index is not for reading
      drafts.push(...splitLong(s.title, toParagraphs(s.lines), MAX_CHAPTER_WORDS));
    }
  } else {
    drafts.push(...splitLong("Part", toParagraphs(lines), FALLBACK_PART_WORDS, true));
  }
  return drafts.filter((d) => d.wordCount > 0).slice(0, MAX_CHAPTERS);
}

/**
 * For files that already know their chapters (EPUB, Word headings, big PDF titles):
 * cleans each section and cuts very long ones into parts.
 */
export function chaptersFromSections(sections: { title: string; paragraphs: string[] }[]): ChapterDraft[] {
  return sections
    .flatMap((s) => splitLong(s.title.trim().slice(0, 200) || "Part", s.paragraphs.map(tidyParagraph).filter(Boolean), MAX_CHAPTER_WORDS))
    .filter((d) => d.wordCount > 0)
    .slice(0, MAX_CHAPTERS);
}

/** One paragraph: no double spaces; keeps line breaks of poems. */
function tidyParagraph(p: string) {
  return p
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Way 1: heading lines
// ---------------------------------------------------------------------------

const NUMBER_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|" +
  "sixteen|seventeen|eighteen|nineteen|twenty|first|second|third|fourth|fifth|last";
const NUM = `(?:\\d{1,3}|[ivxlcdm]{1,8}|${NUMBER_WORDS})`;
/** "CHAPTER I.", "Chapter 3: Title", "PART ONE--Title", "STAVE II" */
const LABELED = new RegExp(
  `^(chapter|chap\\.|book|part|stave|story|letter|section)\\s+(${NUM})\\b\\.?\\s*(?:[-–—:.]+\\s*)?(.*)$`,
  "i",
);
/** "I. A SCANDAL IN BOHEMIA" (title must be in capital letters) */
const NUMBERED_CAPS = /^([IVXLC]{1,7}|\d{1,3})\.\s+([^a-z]{2,80})$/;
/** A line with only a roman number: "IV" or "IV." */
const NUMBER_ALONE = /^([IVXLC]{1,7})\.?$/;

function findHeadingLines(lines: string[]): Heading[] {
  const heads: Heading[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.length > 90 || /[[\]]/.test(t)) continue;
    if (i > 0 && lines[i - 1].trim()) continue; // a heading starts after a blank line

    let m = t.match(LABELED);
    if (m) {
      const label = titleCase(m[1]);
      const rest = stripPageNumber(m[3]);
      const next = rest ? null : titleLineAfter(lines, i);
      const name = `${label} ${/^\d|^[ivxlcdm]+$/i.test(m[2]) ? m[2].toUpperCase() : titleCase(m[2])}`;
      const sub = rest || next?.text;
      heads.push({ line: i, title: sub ? `${name}: ${prettyTitle(sub)}` : name, size: next ? next.line - i + 1 : 1 });
      continue;
    }
    m = t.match(NUMBERED_CAPS);
    if (m && /[A-Z]{2}/.test(m[2])) {
      heads.push({ line: i, title: `${m[1]}. ${prettyTitle(stripPageNumber(m[2]))}`, size: 1 });
      continue;
    }
    m = t.match(NUMBER_ALONE);
    if (m) {
      const next = titleLineAfter(lines, i);
      if (next) heads.push({ line: i, title: `${m[1]}. ${prettyTitle(next.text)}`, size: next.line - i + 1 });
    }
  }
  return heads;
}

/** A short title line right after a heading ("CHAPTER I." / "Down the Rabbit-Hole"). */
function titleLineAfter(lines: string[], i: number) {
  for (let j = i + 1; j <= i + 2 && j < lines.length; j++) {
    const t = lines[j].trim();
    if (!t) continue;
    const endsBlock = !lines[j + 1]?.trim();
    if (t.length <= 70 && endsBlock && /^[A-Z“"'‘]/.test(t) && !LABELED.test(t)) return { line: j, text: t };
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Way 2: the "Contents" list
// ---------------------------------------------------------------------------

function findContentsHeadings(lines: string[]): Heading[] {
  const limit = Math.floor(lines.length * 0.25);
  const tocLine = lines.findIndex((l, i) => i < limit && /^\s*(?:table of )?contents:?\s*$/i.test(l));
  if (tocLine < 0) return [];

  // 1. Read the list until the book text starts.
  const entries: { title: string; key: string }[] = [];
  const seen = new Set<string>();
  let i = tocLine + 1;
  let blankRun = 0;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) {
      if (entries.length && ++blankRun >= 6) break;
      continue;
    }
    blankRun = 0;
    if (t.length > 80) break;
    const title = stripNumbering(stripPageNumber(t));
    const key = keyOf(title);
    if (!key) continue;
    if (entries.length && key === entries[0].key) break; // the first title again = the text started
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ title, key });
  }
  if (entries.length < 3) return [];

  // 2. Index every short, stand-alone line after the list by its key.
  const byKey = new Map<string, number[]>();
  for (let j = i; j < lines.length; j++) {
    const t = lines[j].trim();
    if (!t || t.length > 100 || (j > 0 && lines[j - 1].trim())) continue;
    const key = keyOf(stripNumbering(t));
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(j);
    byKey.set(key, list);
  }

  // 3. Find each title in order.
  const heads: Heading[] = [];
  let cursor = i;
  for (const e of entries) {
    const at = byKey.get(e.key)?.find((j) => j >= cursor);
    if (at === undefined) continue;
    heads.push({ line: at, title: prettyTitle(e.title), size: 1 });
    cursor = at + 1;
  }
  return heads.length >= entries.length * 0.5 ? heads : [];
}

// ---------------------------------------------------------------------------
// Building sections from headings
// ---------------------------------------------------------------------------

function buildSections(lines: string[], heads: Heading[]): Section[] {
  if (heads.length === 0) return [];
  heads.sort((a, b) => a.line - b.line);

  const sections: Section[] = [];
  let firstReal = -1;
  heads.forEach((h, idx) => {
    const end = idx + 1 < heads.length ? heads[idx + 1].line : lines.length;
    const body = lines.slice(h.line + h.size, end);
    // Contents lists look like headings; only real text counts.
    const real = countChars(body.filter((l) => !isContentsLine(l))) >= MIN_SECTION_CHARS;
    if (real) {
      if (firstReal < 0) firstReal = h.line;
      sections.push({ title: h.title, lines: body });
    } else if (sections.length > 0 && countChars(body) > 0) {
      // A very short story in the middle: keep it, inside the previous chapter.
      sections[sections.length - 1].lines.push("", h.title, "", ...body);
    }
    // Short sections before the first real chapter are contents lines: dropped.
  });
  if (sections.length === 0) return [];

  // Front matter (preface, introduction) before the first chapter.
  const titles = new Set(heads.map((h) => keyOf(stripNumbering(h.title))));
  const front = lines
    .slice(0, firstReal)
    .filter((l) => !/^\s*(?:table of )?contents:?\s*$/i.test(l))
    .filter((l) => !titles.has(keyOf(stripNumbering(stripPageNumber(l.trim())))));
  if (countChars(front) >= MIN_INTRO_CHARS) sections.unshift({ title: "Introduction", lines: front });

  return sections;
}

// ---------------------------------------------------------------------------
// Paragraphs and long chapters
// ---------------------------------------------------------------------------

/** Joins the hard-wrapped lines of each paragraph. Short-line blocks (poems) keep their lines. */
function toParagraphs(lines: string[]): string[] {
  const paragraphs: string[] = [];
  let block: string[] = [];
  const flush = () => {
    const parts = block.map((l) => l.trim()).filter(Boolean);
    block = [];
    if (parts.length === 0) return;
    const poem = parts.length >= 2 && parts.every((p) => p.length <= 55);
    paragraphs.push(poem ? parts.join("\n") : parts.join(" ").replace(/\s{2,}/g, " "));
  };
  for (const line of lines) {
    if (line.trim()) block.push(line);
    else flush();
  }
  flush();
  return paragraphs;
}

/** Cuts paragraphs into parts of about the same size, each at most ~`maxWords` words. */
function splitLong(title: string, paragraphs: string[], maxWords: number, numberAll = false): ChapterDraft[] {
  const total = paragraphs.reduce((sum, p) => sum + countWords(p), 0);
  const partCount = Math.max(1, Math.ceil(total / maxWords));
  const target = total / partCount;
  const parts: string[][] = [[]];
  let words = 0;
  for (const p of paragraphs) {
    const w = countWords(p);
    if (words > 0 && words + w / 2 > target && parts.length < partCount) {
      parts.push([]);
      words = 0;
    }
    parts[parts.length - 1].push(p);
    words += w;
  }
  return parts
    .filter((p) => p.length > 0)
    .map((p, i, all) => ({
      title: numberAll ? `${title} ${i + 1}` : all.length > 1 ? `${title} (part ${i + 1})` : title,
      content: p.join("\n\n"),
      wordCount: p.reduce((sum, x) => sum + countWords(x), 0),
    }));
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A line from a contents list: a heading, or a title with a page number. */
function isContentsLine(line: string) {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  return LABELED.test(t) || /^(?:[IVXLC]{1,7}|\d{1,3})\.\s+\S/.test(t) || /(?:[.·]\s*){3,}\d*\s*$|\s{2,}\d{1,4}$/.test(t);
}

function countChars(lines: string[]) {
  return lines.reduce((sum, l) => sum + l.trim().length, 0);
}

export function countWords(text: string) {
  const m = text.match(/\S+/g);
  return m ? m.length : 0;
}

/** Comparable form of a title: capitals and digits only. */
function keyOf(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/** Removes "CHAPTER IV." / "IV." / "4." from the start of a title. */
function stripNumbering(s: string) {
  return s
    .replace(new RegExp(`^(?:chapter|chap\\.|book|part|stave|story|letter|section)\\s+${NUM}\\b\\.?\\s*(?:[-–—:.]+\\s*)?`, "i"), "")
    .replace(/^(?:[IVXLC]{1,7}|\d{1,3})\.\s+/, "")
    .trim();
}

/** Removes ". . . . 23" page numbers at the end of a contents line. */
function stripPageNumber(s: string) {
  return s.replace(/(?:\s*[.·]\s*){2,}\s*\d*\s*$/, "").replace(/\s{2,}\d{1,4}\s*$/, "").trim();
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);

/** "A SCANDAL IN BOHEMIA" → "A Scandal in Bohemia". Mixed-case titles stay as they are. */
function prettyTitle(s: string) {
  const clean = s.replace(/\s+/g, " ").replace(/[.:]$/, "").trim();
  if (/[a-z]/.test(clean)) return clean;
  return titleCase(clean);
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ")
    .replace(/\b(i{1,3}|iv|v|vi{1,3}|ix|x{1,3})\b/gi, (r) => r.toUpperCase());
}
