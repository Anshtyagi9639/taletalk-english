import JSZip from "jszip";
import mammoth from "mammoth";
import { decodeEntities } from "../../text/entities";
import { blocksToChapters, htmlToBlocks } from "./html";
import { ParseError, type ParsedBook } from "./types";

/** Word (.docx): mammoth turns it into simple HTML; Word headings become chapters. */
export async function parseDocx(bytes: Uint8Array): Promise<ParsedBook> {
  const buffer = Buffer.from(bytes);
  let html: string;
  try {
    html = (await mammoth.convertToHtml({ buffer })).value;
  } catch {
    throw new ParseError("This Word file is broken, or it is an old .doc file. Please save it as .docx and try again.");
  }

  // Title and author from the file's properties (docProps/core.xml), if they are set.
  let title: string | null = null;
  let author: string | null = null;
  try {
    const core = await (await JSZip.loadAsync(buffer)).file("docProps/core.xml")?.async("string");
    const get = (tag: string) => {
      const v = core?.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1];
      return v ? decodeEntities(v).trim() || null : null;
    };
    title = get("dc:title");
    author = get("dc:creator");
  } catch {
    // no properties: we use the file name
  }

  return { title, author, chapters: blocksToChapters(htmlToBlocks(html)) };
}
