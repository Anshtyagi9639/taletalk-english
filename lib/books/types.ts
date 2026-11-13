/** Shared types for the Library (used on the server and in the browser). */

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type Level = (typeof LEVELS)[number];

export type BookSource = "gutenberg" | "upload" | "ai" | "info_only";
export type ReadingStatus = "want" | "reading" | "finished";

/** A book row as the Library page uses it (plus its reading status). */
export type LibraryBook = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  source: BookSource;
  level: Level | null;
  genre: string | null;
  word_count: number;
  chapter_count: number;
  created_at: string;
  status: ReadingStatus;
  percent: number;
};

/** One result from "Search free classic books". */
export type GutenbergResult = {
  gutenbergId: number;
  title: string;
  author: string | null;
  coverUrl: string | null;
  /** Rough level guess from the subjects (the real level is measured when you add it). */
  levelGuess: Level | null;
  genre: string | null;
  /**
   * true = free to read. false = still under copyright in the USA (no full text).
   * null = not known yet; the server checks again when you add the book.
   */
  publicDomain: boolean | null;
};

/** One result from Open Library (book info + cover only, no full text). */
export type OpenLibraryResult = {
  key: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  year: number | null;
  url: string;
};

/** A chapter ready to be saved. */
export type ChapterDraft = {
  title: string;
  content: string;
  wordCount: number;
};
