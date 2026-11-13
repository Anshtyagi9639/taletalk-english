import { extractTextItems, getDocumentProxy, getMeta, type StructuredTextItem } from "unpdf";
import { blocksToChapters, type Block } from "./html";
import { ParseError, type ParsedBook } from "./types";

/**
 * PDF has no paragraphs, only text pieces with positions. We rebuild them:
 *  1. pieces → lines (same height on the page),
 *  2. remove page numbers and headers/footers that repeat on many pages,
 *  3. lines → paragraphs (new paragraph after a bigger gap, an indent, or a short line that ends a sentence),
 *  4. bigger text → headings (chapter titles).
 */

type Line = { text: string; x: number; y: number; right: number; size: number };

export async function parsePdf(bytes: Uint8Array): Promise<ParsedBook> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;
  try {
    pdf = await getDocumentProxy(new Uint8Array(bytes));
  } catch (err) {
    const message = String((err as Error)?.message ?? err);
    if (/PDF\.js bundle/i.test(message)) {
      // unpdf's PDF.js needs Node.js 22+ (Vercel uses it already).
      throw new ParseError("Reading PDF files needs Node.js 22 or newer on the computer that runs the app.");
    }
    if (/password/i.test(message)) {
      throw new ParseError("This PDF is locked with a password. Please upload a copy without a password.");
    }
    throw new ParseError("This PDF file is broken or is not really a PDF.");
  }

  const [meta, { totalPages, items }] = await Promise.all([getMeta(pdf).catch(() => null), extractTextItems(pdf)]);
  const pages = items.map(toLines);

  const chars = pages.flat().reduce((sum, l) => sum + l.text.length, 0);
  if (chars < Math.max(200, totalPages * 40)) {
    throw new ParseError(
      "This PDF has no text we can read. It looks like scanned pictures of pages. Please upload a PDF with real text, or an EPUB.",
    );
  }

  const bodySize = bodyFontSize(pages.flat());
  const lineGap = normalLineGap(pages, bodySize);
  removeHeadersAndPageNumbers(pages, bodySize, lineGap);
  const blocks = linesToBlocks(pages, bodySize, lineGap);

  const info = (meta?.info ?? {}) as { Title?: unknown; Author?: unknown };
  const title = typeof info.Title === "string" && info.Title.trim().length > 1 ? info.Title.trim() : null;
  const author = typeof info.Author === "string" && info.Author.trim() ? info.Author.trim() : null;
  return { title, author, chapters: blocksToChapters(blocks) };
}

/** Text pieces of one page → lines from top to bottom. */
function toLines(pieces: StructuredTextItem[]): Line[] {
  const sorted = pieces.filter((p) => p.str.length > 0).sort((a, b) => b.y - a.y);
  const groups: StructuredTextItem[][] = [];
  for (const p of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[0].y - p.y) <= Math.max(2, (p.fontSize || 10) * 0.5)) g.push(p);
    else groups.push([p]);
  }
  return groups
    .map((g) => {
      g.sort((a, b) => a.x - b.x);
      let text = "";
      let right = g[0].x;
      for (const p of g) {
        const gap = p.x - right;
        if (text && !text.endsWith(" ") && !p.str.startsWith(" ") && gap > (p.fontSize || 10) * 0.12) text += " ";
        text += p.str;
        right = Math.max(right, p.x + p.width);
      }
      return {
        text: text.replace(/\s+/g, " ").trim(),
        x: g[0].x,
        y: g[0].y,
        right,
        size: Math.max(...g.map((p) => p.fontSize || 0)),
      };
    })
    .filter((l) => l.text);
}

const PAGE_NUMBER = /^(?:page\s*)?\d{1,4}(?:\s*(?:of|\/)\s*\d{1,4})?$|^[ivxlc]{1,6}$|^[-–—]\s*\d{1,4}\s*[-–—]$/i;

/** The text size used by most characters (= normal body text). */
function bodyFontSize(lines: Line[]) {
  return median(lines.flatMap((l) => Array(Math.min(50, l.text.length)).fill(Math.round(l.size * 2) / 2))) || 10;
}

/** The usual distance between two lines of body text. */
function normalLineGap(pages: Line[][], bodySize: number) {
  const gaps = pages.flatMap((p) => p.slice(1).map((l, i) => p[i].y - l.y)).filter((g) => g > 0 && g < bodySize * 3);
  return median(gaps) || bodySize * 1.2;
}

/**
 * Drops page numbers and lines that repeat at the top/bottom of many pages.
 * Only lines that LOOK like headers/footers count: smaller text, or set apart from the
 * body by a big gap. Bigger text (chapter titles like "Chapter 1") is never removed.
 */
function removeHeadersAndPageNumbers(pages: Line[][], bodySize: number, lineGap: number) {
  const setApart = (page: Line[], j: number) => {
    const line = page[j];
    if (line.size < bodySize * 0.95) return true;
    const above = j > 0 ? page[j - 1].y - line.y : Infinity;
    const below = j < page.length - 1 ? line.y - page[j + 1].y : Infinity;
    return Math.min(above, below) > lineGap * 1.8;
  };
  const edgeKey = (l: Line) => l.text.replace(/\d+/g, "#").toLowerCase();
  const counts = new Map<string, number>();
  for (const page of pages) {
    const edges = new Set([...page.slice(0, 2), ...page.slice(-2)].map(edgeKey));
    edges.forEach((k) => counts.set(k, (counts.get(k) ?? 0) + 1));
  }
  const repeated = (l: Line) => (counts.get(edgeKey(l)) ?? 0) >= Math.max(3, pages.length * 0.3);

  pages.forEach((page, i) => {
    pages[i] = page.filter((l, j) => {
      const atEdge = j < 2 || j >= page.length - 2;
      if (!atEdge || l.size >= bodySize * 1.2 || !setApart(page, j)) return true;
      return !(PAGE_NUMBER.test(l.text) || repeated(l));
    });
  });
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function percentile(values: number[], p: number) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

/** Lines → paragraphs and headings. */
function linesToBlocks(pages: Line[][], bodySize: number, lineGap: number): Block[] {
  const all = pages.flat();
  const leftX = percentile(all.map((l) => l.x), 0.1);
  const typicalRight = percentile(all.map((l) => l.right), 0.9);

  const blocks: Block[] = [];
  let para = "";
  let prev: Line | null = null;
  const flush = () => {
    if (para.trim()) blocks.push({ text: para.trim(), heading: 0 });
    para = "";
  };
  const endsSentence = (t: string) => /[.!?:"”’)]$/.test(t);

  pages.forEach((page) => {
    page.forEach((line, j) => {
      const isHeading = line.size >= bodySize * 1.2 && line.text.length <= 120;
      if (isHeading) {
        flush();
        const level = line.size >= bodySize * 1.6 ? 1 : 2;
        const last = blocks[blocks.length - 1];
        // A title on two lines: join them.
        if (last?.heading === level && prev && prev.size === line.size && j > 0 && prev.y - line.y < line.size * 2) {
          last.text += ` ${line.text}`;
        } else blocks.push({ text: line.text, heading: level });
        prev = line;
        return;
      }

      const indented = line.x > leftX + bodySize * 0.8 && line.x < leftX + bodySize * 8;
      const shortEnd = prev !== null && endsSentence(prev.text) && prev.right < typicalRight - bodySize * 3;
      let newPara: boolean;
      if (j === 0) newPara = !para || (prev !== null && endsSentence(prev.text) && (indented || shortEnd));
      else newPara = (prev !== null && prev.y - line.y > lineGap * 1.5) || indented || shortEnd;
      if (prev && prev.size >= bodySize * 1.2) newPara = true;

      if (newPara) flush();
      if (para.endsWith("-") && /^[a-z]/.test(line.text)) para = para.slice(0, -1) + line.text; // hyphenated word
      else para += (para ? " " : "") + line.text;
      prev = line;
    });
  });
  flush();
  return blocks;
}
