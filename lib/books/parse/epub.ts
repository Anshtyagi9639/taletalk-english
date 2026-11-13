import JSZip from "jszip";
import { decodeEntities } from "../../text/entities";
import { chaptersFromSections, countWords } from "../split";
import { htmlToBlocks } from "./html";
import { ParseError, type ParsedBook } from "./types";

/**
 * EPUB = a zip of web pages. We read:
 *  META-INF/container.xml → the .opf file → title, author, the reading order (spine)
 *  and the table of contents (for chapter names). Each page in the spine becomes a chapter.
 */
export async function parseEpub(bytes: Uint8Array): Promise<ParsedBook> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new ParseError("This EPUB file is broken or is not really an EPUB.");
  }
  const read = (path: string) => zip.file(path)?.async("string");

  // Locked (DRM) books cannot be read. Font "obfuscation" is fine.
  const encryption = await read("META-INF/encryption.xml");
  if (encryption) {
    const algorithms = [...encryption.matchAll(/Algorithm="([^"]+)"/g)].map((m) => m[1]);
    const onlyFonts = algorithms.every((a) => /idpf\.org\/2008\/embedding|ns\.adobe\.com\/pdf\/enc#RC/.test(a));
    if (!onlyFonts) {
      throw new ParseError("This EPUB is locked (DRM), so we cannot read it. Please use a DRM-free copy.");
    }
  }

  const container = await read("META-INF/container.xml");
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  const opf = opfPath ? await read(opfPath) : undefined;
  if (!opfPath || !opf) throw new ParseError("This EPUB file is missing its book information.");
  const base = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";

  const title = xmlText(opf, "dc:title");
  const author = xmlText(opf, "dc:creator");

  // manifest: id → file
  const manifest = new Map<string, { href: string; type: string; props: string }>();
  for (const m of opf.matchAll(/<item\b[^>]*>/g)) {
    const a = attrs(m[0]);
    if (a.id && a.href) manifest.set(a.id, { href: a.href, type: a["media-type"] ?? "", props: a.properties ?? "" });
  }

  // Chapter names from the table of contents (EPUB 3 nav page, or EPUB 2 toc.ncx).
  const titles = new Map<string, string>();
  const nav = [...manifest.values()].find((i) => /\bnav\b/.test(i.props));
  const ncxId = opf.match(/<spine\b[^>]*\btoc="([^"]+)"/)?.[1];
  const ncx = ncxId ? manifest.get(ncxId) : [...manifest.values()].find((i) => i.type === "application/x-dtbncx+xml");
  if (nav) {
    const navPath = join(base, nav.href);
    const html = (await read(navPath)) ?? "";
    for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
      addTitle(titles, join(dir(navPath), m[1]), m[2]);
    }
  }
  if (ncx && titles.size === 0) {
    const ncxPath = join(base, ncx.href);
    const xml = (await read(ncxPath)) ?? "";
    for (const m of xml.matchAll(/<navPoint\b[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<content\b[^>]*src="([^"]+)"/gi)) {
      addTitle(titles, join(dir(ncxPath), m[2]), m[1]);
    }
  }

  // Reading order.
  const sections: { title: string; paragraphs: string[] }[] = [];
  for (const m of opf.matchAll(/<itemref\b[^>]*>/g)) {
    const a = attrs(m[0]);
    const item = a.idref ? manifest.get(a.idref) : undefined;
    if (!item || !/html/.test(item.type)) continue;
    const path = join(base, item.href);
    const html = await read(path);
    if (!html) continue;
    const blocks = htmlToBlocks(html);
    const paragraphs = blocks.filter((b, i) => !(i === 0 && b.heading)).map((b) => b.text);
    const words = countWords(paragraphs.join(" "));
    if (words < 15) continue; // cover, title page, empty page
    // Project Gutenberg EPUBs: skip their licence pages (they are not part of the story).
    if (words < 4000 && /\*{3}\s*(?:START|END) OF (?:THE|THIS) PROJECT GUTENBERG/i.test(paragraphs.join(" "))) continue;
    const firstHeading = blocks.find((b) => b.heading)?.text;
    sections.push({ title: titles.get(path) ?? firstHeading ?? `Part ${sections.length + 1}`, paragraphs });
  }

  const chapters = chaptersFromSections(sections);
  return { title, author, chapters };
}

// ---------------------------------------------------------------------------
// Small XML helpers (EPUB files are simple enough for this)
// ---------------------------------------------------------------------------

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) out[m[1]] = decodeEntities(m[3] ?? m[4] ?? "");
  return out;
}

function xmlText(xml: string, tag: string) {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  const text = m ? decodeEntities(m[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim() : "";
  return text || null;
}

function addTitle(map: Map<string, string>, href: string, label: string) {
  const path = href.split("#")[0];
  const text = decodeEntities(label.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  if (path && text && !map.has(path)) map.set(path, text);
}

function dir(path: string) {
  return path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
}

/** Joins a folder and a relative link ("../Text/ch1.xhtml"), like a browser does. */
function join(base: string, href: string) {
  const parts = (base + decodeURIComponent(href.split("#")[0])).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}
