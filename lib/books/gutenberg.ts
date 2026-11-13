import "server-only";
import { decodeEntities, displayName, fetchWithTimeout } from "./fetch";
import { genreFromSubjects, guessLevelFromSubjects } from "./levels";
import type { GutenbergResult } from "./types";

/**
 * Project Gutenberg: free public-domain books.
 * - Search: Gutendex API (rich data, but often slow). If it is too slow,
 *   we use Gutenberg's own fast OPDS search instead.
 * - Book info and text: straight from gutenberg.org (fast).
 */

/** Longest wait for Gutendex in total. */
const GUTENDEX_WAIT_MS = 15000;
/** How long we still wait for Gutendex after the fast search has its results. */
const EXTRA_WAIT_MS = 5000;
const MAX_BOOK_BYTES = 10 * 1024 * 1024;

export function gutenbergCover(id: number) {
  return `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;
}

export function gutenbergPage(id: number) {
  return `https://www.gutenberg.org/ebooks/${id}`;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export type SearchMode = "all" | "topic";

/**
 * Searches free classic books. Returns at most 24 English books.
 * Both searches start together. Gutendex has better data, but it is often slow,
 * so we wait for it only a few seconds after the fast Gutenberg search has finished.
 */
export async function searchClassics(query: string, mode: SearchMode) {
  const gutendex = searchGutendex(query, mode).catch(() => null);
  const opds = searchOpds(query).catch(() => null);

  const gutendexInTime = Promise.race([
    gutendex,
    opds.then(() => new Promise<null>((resolve) => setTimeout(() => resolve(null), EXTRA_WAIT_MS))),
  ]);
  const rich = await gutendexInTime;
  if (rich && rich.length > 0) return { results: rich, via: "gutendex" as const };
  return { results: (await opds) ?? [], via: "gutenberg" as const };
}

type GutendexBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean | null;
  media_type: string;
  formats: Record<string, string>;
};

async function searchGutendex(query: string, mode: SearchMode): Promise<GutenbergResult[]> {
  const param = mode === "topic" ? "topic" : "search";
  const url = `https://gutendex.com/books/?${param}=${encodeURIComponent(query)}&languages=en`;
  const res = await fetchWithTimeout(url, GUTENDEX_WAIT_MS);
  if (!res.ok) throw new Error(`Gutendex ${res.status}`);
  const data = (await res.json()) as { results: GutendexBook[] };
  return data.results
    .filter((b) => b.media_type === "Text")
    .slice(0, 24)
    .map((b) => {
      const subjects = [...b.subjects, ...b.bookshelves];
      return {
        gutenbergId: b.id,
        title: shortTitle(b.title),
        author: b.authors.length ? b.authors.map((a) => displayName(a.name)).join(" and ") : null,
        coverUrl: b.formats["image/jpeg"] ?? gutenbergCover(b.id),
        levelGuess: guessLevelFromSubjects(subjects),
        genre: genreFromSubjects(subjects),
        publicDomain: b.copyright === null ? null : !b.copyright,
      };
    });
}

/** Gutenberg's own catalog search (Atom/OPDS XML). Fast, but has less detail. */
async function searchOpds(query: string): Promise<GutenbergResult[]> {
  const url = `https://www.gutenberg.org/ebooks/search.opds/?query=${encodeURIComponent(query)}`;
  const res = await fetchWithTimeout(url, 15000);
  if (!res.ok) throw new Error(`Gutenberg search ${res.status}`);
  const xml = await res.text();
  const results: GutenbergResult[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const id = Number(entry.match(/<id>[^<]*\/ebooks\/(\d+)\.opds<\/id>/)?.[1]);
    if (!id) continue; // "Authors" / "Subjects" links, not books
    const title = tag(entry, "title");
    if (!title) continue;
    results.push({
      gutenbergId: id,
      title: shortTitle(title),
      author: tag(entry, "content") || null,
      coverUrl: gutenbergCover(id),
      levelGuess: null,
      genre: null,
      publicDomain: null,
    });
  }
  return results.slice(0, 24);
}

// ---------------------------------------------------------------------------
// One book
// ---------------------------------------------------------------------------

export type GutenbergMeta = {
  gutenbergId: number;
  title: string;
  author: string | null;
  coverUrl: string;
  language: string | null;
  publicDomain: boolean;
  subjects: string[];
  summary: string | null;
};

/** Reads one book's details from gutenberg.org. Returns null if the book does not exist. */
export async function getGutenbergMeta(id: number): Promise<GutenbergMeta | null> {
  const res = await fetchWithTimeout(`https://www.gutenberg.org/ebooks/${id}.opds`, 20000);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Gutenberg book info ${res.status}`);
  const xml = await res.text();
  const entry = xml.split("<entry>")[1];
  if (!entry) return null;

  const rights = tag(entry, "rights");
  const subjects = [
    ...[...entry.matchAll(/<category scheme="[^"]*LCSH" term="([^"]+)"/g)].map((m) => decodeEntities(m[1])),
    ...[...entry.matchAll(/title="In (?:Category: )?([^"…]+)…?"/g)].map((m) => decodeEntities(m[1])),
  ];
  const author = entry.match(/<author>\s*<name>([^<]+)<\/name>/)?.[1];
  const summary = entry
    .match(/Summary:\s*([\s\S]*?)<\/p>/)?.[1]
    ?.replace(/\(This is an automatically generated summary\.\)/, "")
    .trim();

  return {
    gutenbergId: id,
    title: shortTitle(tag(entry, "title") ?? `Book ${id}`),
    author: author ? displayName(decodeEntities(author)) : null,
    coverUrl: entry.match(/rel="http:\/\/opds-spec\.org\/image" href="([^"]+)"/)?.[1] ?? gutenbergCover(id),
    language: tag(entry, "dcterms:language"),
    publicDomain: /public domain/i.test(rights ?? ""),
    subjects,
    summary: summary ? decodeEntities(summary.replace(/<[^>]+>/g, "")) : null,
  };
}

/** Downloads the plain-text book (UTF-8). */
export async function downloadGutenbergText(id: number): Promise<string> {
  const urls = [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/ebooks/${id}.txt.utf-8`,
  ];
  for (const url of urls) {
    const res = await fetchWithTimeout(url, 60000).catch(() => null);
    if (!res?.ok) continue;
    const size = Number(res.headers.get("content-length") ?? 0);
    if (size > MAX_BOOK_BYTES) throw new Error("This book is too big.");
    const text = await res.text();
    if (text.length > MAX_BOOK_BYTES) throw new Error("This book is too big.");
    if (text.trim()) return text;
  }
  throw new Error("No plain-text version of this book.");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Text inside <name>…</name> (first match). */
function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([^<]*)</${name}>`));
  return m ? decodeEntities(m[1]).trim() : null;
}

/** "Title: Subtitle; or, Another Title" → "Title: Subtitle" (keeps cards short). */
function shortTitle(title: string) {
  return title.split(/\s*;\s*or,?\s*/i)[0].replace(/\s+/g, " ").trim();
}
