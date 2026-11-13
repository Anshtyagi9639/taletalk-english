import { decodeEntities } from "../../text/entities";
import { chaptersFromSections, countWords, splitIntoChapters } from "../split";
import type { ChapterDraft } from "../types";

/** A paragraph of text, or a heading (level 1-6). */
export type Block = { text: string; heading: number };

const H = "\u0001"; // marks a heading in the text while we convert

/** HTML → plain blocks (paragraphs and headings). Keeps <br> line breaks (poems). */
export function htmlToBlocks(html: string): Block[] {
  const text = decodeEntities(
    html
      .replace(/<head[\s\S]*?<\/head>/i, "")
      .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      // In HTML a line break in the file is just a space. Only <br> and blocks break lines.
      .replace(/\s+/g, " ")
      .replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => `\n\n${H}${level}${inner.replace(/<br\s*\/?>/gi, " ")}\n\n`)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?(?:p|div|li|ul|ol|blockquote|section|article|header|footer|tr|table|pre|figure|figcaption|dd|dt|dl|aside|nav|hr|body)\b[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  );
  return text
    .split(/\n[ \t ]*\n/)
    .map((chunk) => {
      const heading = chunk.trimStart().startsWith(H) ? Number(chunk.trimStart()[1]) : 0;
      const body = (heading ? chunk.trimStart().slice(2) : chunk)
        .split("\n")
        .map((l) => l.replace(/[ \t ]+/g, " ").trim())
        .filter(Boolean)
        .join(heading ? " " : "\n");
      return { text: body, heading };
    })
    .filter((b) => b.text && /[\p{L}\p{N}]/u.test(b.text));
}

/**
 * Blocks → chapters. If the text has 2+ headings of the same level, they become chapters;
 * otherwise we look for chapter headings in the text itself.
 */
export function blocksToChapters(blocks: Block[]): ChapterDraft[] {
  const counts = new Map<number, number>();
  for (const b of blocks) if (b.heading) counts.set(b.heading, (counts.get(b.heading) ?? 0) + 1);
  const level = [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => a[0] - b[0])[0]?.[0];

  if (level) {
    const sections: { title: string; paragraphs: string[] }[] = [{ title: "Introduction", paragraphs: [] }];
    for (const b of blocks) {
      if (b.heading === level) sections.push({ title: b.text, paragraphs: [] });
      else sections[sections.length - 1].paragraphs.push(b.text);
    }
    // Keep the part before the first heading only if it is real text (not just a title page).
    if (countWords(sections[0].paragraphs.join(" ")) < 100) sections.shift();
    const chapters = chaptersFromSections(sections);
    if (chapters.length >= 2) return chapters;
  }
  return splitIntoChapters(blocks.map((b) => b.text).join("\n\n"));
}
