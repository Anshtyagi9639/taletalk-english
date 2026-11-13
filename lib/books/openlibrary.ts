import "server-only";
import { fetchWithTimeout } from "./fetch";
import type { OpenLibraryResult } from "./types";

/**
 * Open Library: book details and covers for ANY book (also new ones under copyright).
 * We only show info + a link here. Full text comes only from Gutenberg or your uploads.
 */

type SearchDoc = { key: string; title: string; author_name?: string[]; cover_i?: number; first_publish_year?: number };
const FIELDS = "key,title,author_name,cover_i,first_publish_year";

function toResult(d: SearchDoc): OpenLibraryResult {
  return {
    key: d.key,
    title: d.title,
    author: d.author_name?.slice(0, 2).join(" and ") ?? null,
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
    year: d.first_publish_year ?? null,
    url: `https://openlibrary.org${d.key}`,
  };
}

async function search(params: string, limit: number) {
  const url = `https://openlibrary.org/search.json?${params}&limit=${limit}&fields=${FIELDS}`;
  const res = await fetchWithTimeout(url, 12000);
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as { docs: SearchDoc[] };
  return data.docs.map(toResult);
}

/** Free-text search ("harry potter"). */
export function searchOpenLibrary(query: string, limit = 6): Promise<OpenLibraryResult[]> {
  return search(`q=${encodeURIComponent(query)}`, limit);
}

/** Search by title (and author, if known). Used after reading a book photo. */
export function searchOpenLibraryByTitle(title: string, author: string | null, limit = 6): Promise<OpenLibraryResult[]> {
  const params = `title=${encodeURIComponent(title)}${author ? `&author=${encodeURIComponent(author)}` : ""}`;
  return search(params, limit);
}

export type OpenLibraryWork = {
  key: string;
  title: string;
  /** The publisher-style description (we give this to the AI as background only). */
  description: string | null;
  subjects: string[];
  coverUrl: string | null;
  url: string;
};

/** One book ("work") by its key, e.g. "/works/OL27482W". Null if not found. */
export async function getOpenLibraryWork(key: string): Promise<OpenLibraryWork | null> {
  if (!/^\/works\/OL\d+W$/.test(key)) return null;
  const res = await fetchWithTimeout(`https://openlibrary.org${key}.json`, 12000);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  // Note: the record also has "excerpts" and "first_sentence" (the book's own text). We never use them.
  const w = (await res.json()) as {
    title?: string;
    description?: string | { value?: string };
    subjects?: string[];
    covers?: number[];
  };
  const description = typeof w.description === "string" ? w.description : (w.description?.value ?? null);
  const cover = w.covers?.find((c) => c > 0);
  return {
    key,
    title: w.title ?? "Unknown book",
    description: description ? description.slice(0, 2000) : null,
    subjects: (w.subjects ?? []).slice(0, 15),
    coverUrl: cover ? `https://covers.openlibrary.org/b/id/${cover}-L.jpg` : null,
    url: `https://openlibrary.org${key}`,
  };
}
