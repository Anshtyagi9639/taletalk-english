import { cleanGutenbergText } from "../clean";
import { splitIntoChapters } from "../split";
import { ParseError, type ParsedBook } from "./types";

/** Plain text. Works with UTF-8, UTF-16 and old Windows files, and with Gutenberg .txt files. */
export function parseTxt(bytes: Uint8Array): ParsedBook {
  let text: string;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder("utf-16le").decode(bytes);
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder("utf-16be").decode(bytes);
  else {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
    }
  }
  if (text.includes("\u0000")) throw new ParseError("This does not look like a text file.");

  // Gutenberg-style header lines, if present.
  const head = text.slice(0, 5000);
  const title = head.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const author = head.match(/^Author:\s*(.+)$/m)?.[1]?.trim() ?? null;

  return { title, author, chapters: splitIntoChapters(cleanGutenbergText(text)) };
}
