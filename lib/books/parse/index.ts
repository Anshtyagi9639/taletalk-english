import { countWords } from "../split";
import { titleFromFileName, uploadExt } from "../upload-types";
import { parseDocx } from "./docx";
import { parseEpub } from "./epub";
import { parsePdf } from "./pdf";
import { parseTxt } from "./txt";
import { ParseError, type ParsedBook } from "./types";

export { ParseError } from "./types";

/** Reads an uploaded book (PDF, EPUB, DOCX, TXT) into title, author and chapters. */
export async function parseBookFile(bytes: Uint8Array, fileName: string): Promise<ParsedBook & { title: string }> {
  const ext = uploadExt(fileName);
  if (!ext) throw new ParseError("We can read PDF, EPUB, DOCX and TXT files only.");
  if (bytes.length === 0) throw new ParseError("This file is empty.");

  const parsed: ParsedBook =
    ext === "pdf" ? await parsePdf(bytes)
    : ext === "epub" ? await parseEpub(bytes)
    : ext === "docx" ? await parseDocx(bytes)
    : parseTxt(bytes);

  const words = parsed.chapters.reduce((sum, c) => sum + countWords(c.content), 0);
  if (parsed.chapters.length === 0 || words < 50) {
    throw new ParseError("We could not find enough text in this file.");
  }
  return { ...parsed, title: (parsed.title ?? titleFromFileName(fileName)).slice(0, 300) };
}
