import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BookSource, Level, LibraryBook, ReadingStatus } from "./types";

/** True for a valid database id (uuid). Stops bad URLs before they reach the database. */
export function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

type BookRow = Omit<LibraryBook, "status" | "percent"> & {
  reading_progress: { status: ReadingStatus; percent: number }[] | null;
};

const BOOK_FIELDS =
  "id, title, author, cover_url, source, level, genre, word_count, chapter_count, created_at, reading_progress(status, percent)";

function toLibraryBook(row: BookRow): LibraryBook {
  const progress = row.reading_progress?.[0];
  return {
    ...row,
    status: progress?.status ?? "want",
    percent: Number(progress?.percent ?? 0),
  };
}

/** All books in my library, newest first. */
export async function getLibraryBooks(): Promise<LibraryBook[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_FIELDS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Could not load books: ${error.message}`);
  return (data as unknown as BookRow[]).map(toLibraryBook);
}

/** Gutenberg ids already in my library (to show "Added" in search). */
export async function getMyGutenbergIds(): Promise<number[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("books").select("gutenberg_id").not("gutenberg_id", "is", null);
  return (data ?? []).map((r) => r.gutenberg_id as number);
}

export type ChapterListItem = { id: string; number: number; title: string; word_count: number };

export type BookDetails = LibraryBook & {
  summary: string | null;
  gutenberg_id: number | null;
  is_public_domain: boolean;
  external_url: string | null;
  published_year: number | null;
  level_reason: string | null;
  chapters: ChapterListItem[];
};

/** One book with its chapter list (titles only, no text). Null if not found. */
export async function getBookDetails(id: string): Promise<BookDetails | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(
      `${BOOK_FIELDS}, summary, gutenberg_id, is_public_domain, external_url, published_year, level_reason, chapters(id, number, title, word_count)`,
    )
    .eq("id", id)
    .order("number", { referencedTable: "chapters", ascending: true })
    .maybeSingle();
  if (error) throw new Error(`Could not load the book: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as BookRow & Omit<BookDetails, keyof LibraryBook>;
  return { ...row, ...toLibraryBook(row), chapters: row.chapters ?? [] };
}

/** Narrow helper types for inserts. */
export type NewBook = {
  title: string;
  author: string | null;
  cover_url: string | null;
  source: BookSource;
  level: Level | null;
  genre: string | null;
  is_public_domain: boolean;
  gutenberg_id?: number | null;
  summary?: string | null;
  /** Path in the "books" Storage bucket (uploads). */
  file_path?: string | null;
};
