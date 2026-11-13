/**
 * Cleans plain text from Project Gutenberg:
 * removes the licence header/footer, illustration notes and _italic_ marks.
 */
export function cleanGutenbergText(raw: string): string {
  let text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  // Keep only the book between "*** START OF ..." and "*** END OF ...".
  const start = text.search(/^\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG.*$/im);
  if (start >= 0) text = text.slice(text.indexOf("\n", start) + 1);
  const end = text.search(/^\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG/im);
  if (end >= 0) text = text.slice(0, end);
  const oldEnd = text.search(/^\s*End of (?:the )?Project Gutenberg/im);
  if (oldEnd >= 0) text = text.slice(0, oldEnd);

  return cleanBookText(text);
}

/** Cleaning that is useful for any book text (Gutenberg or uploads). */
export function cleanBookText(text: string): string {
  return (
    text
      .replace(/\r\n?/g, "\n")
      // "[Illustration: ... Chapter I.]" → keep the chapter heading, drop the rest.
      .replace(/\[Illustration[^\]]*\]/gi, (m) => {
        const heading = m.match(/\n\s*((?:chapter|book|part)\s+[ivxlcdm\d]+\.?)\s*\]$/i);
        return heading ? `\n\n${heading[1]}\n\n` : "\n";
      })
      // Credit lines at the very start ("Produced by ...").
      .replace(/^\s*(?:Produced by|E-text prepared by|Transcribed from)[\s\S]*?\n\s*\n/i, "")
      // _italic_ marks (plain text has no italics).
      .replace(/_([^_\n]{1,200}(?:\n[^_\n]{1,200}){0,3})_/g, "$1")
      .trim()
  );
}
