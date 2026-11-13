"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanGutenbergText } from "@/lib/books/clean";
import { downloadGutenbergText, getGutenbergMeta } from "@/lib/books/gutenberg";
import { genreFromSubjects, levelFromChapters } from "@/lib/books/levels";
import { parseBookFile, ParseError } from "@/lib/books/parse";
import { uploadExt } from "@/lib/books/upload-types";
import { isUuid } from "@/lib/books/queries";
import { saveBookWithChapters } from "@/lib/books/save";
import { splitIntoChapters } from "@/lib/books/split";
import { findStarter } from "@/lib/books/starters";
import type { ReadingStatus } from "@/lib/books/types";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** The logged-in user's id, or null. */
async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

const LOGIN_AGAIN = "Please log in again.";

/**
 * Adds a free classic book from Project Gutenberg:
 * check it is public domain → download the text → clean → split → save.
 */
export async function addGutenbergBook(
  gutenbergId: number,
): Promise<ActionResult<{ bookId: string; title: string; chapters: number; already: boolean }>> {
  if (!Number.isInteger(gutenbergId) || gutenbergId <= 0) return { ok: false, error: "This book number is not valid." };

  const supabase = await createClient();
  if (!(await currentUserId(supabase))) return { ok: false, error: LOGIN_AGAIN };

  // Already in my library? Then just open it.
  const { data: existing } = await supabase
    .from("books")
    .select("id, title, chapter_count")
    .eq("gutenberg_id", gutenbergId)
    .maybeSingle();
  if (existing) {
    return { ok: true, bookId: existing.id, title: existing.title, chapters: existing.chapter_count, already: true };
  }

  try {
    const meta = await getGutenbergMeta(gutenbergId);
    if (!meta) return { ok: false, error: "We could not find this book on Project Gutenberg." };
    // Copyright rule: full text only for public-domain books.
    if (!meta.publicDomain) {
      return { ok: false, error: "This book is still under copyright, so we cannot add the full text." };
    }
    if (meta.language && meta.language !== "en") return { ok: false, error: "This book is not in English." };

    const text = cleanGutenbergText(await downloadGutenbergText(gutenbergId));
    const chapters = splitIntoChapters(text);
    if (chapters.length === 0) return { ok: false, error: "This book has no text we can read." };

    const starter = findStarter(gutenbergId);
    const bookId = await saveBookWithChapters(
      supabase,
      {
        title: starter?.title ?? meta.title,
        author: starter?.author ?? meta.author,
        cover_url: meta.coverUrl,
        source: "gutenberg",
        level: starter?.level ?? levelFromChapters(chapters),
        genre: starter?.genre ?? genreFromSubjects(meta.subjects),
        is_public_domain: true,
        gutenberg_id: gutenbergId,
        summary: meta.summary,
      },
      chapters,
    );
    return { ok: true, bookId, title: starter?.title ?? meta.title, chapters: chapters.length, already: false };
  } catch (err) {
    console.error(`addGutenbergBook(${gutenbergId}) failed:`, err);
    const message = err instanceof Error ? err.message : "";
    if (/too big/i.test(message)) return { ok: false, error: "This book is too big to add." };
    if (/plain-text/i.test(message)) return { ok: false, error: "This book has no plain-text version." };
    if (/timeout|abort|fetch/i.test(message)) {
      return { ok: false, error: "Project Gutenberg is slow right now. Please try again in a minute." };
    }
    return { ok: false, error: "Sorry, we could not add this book. Please try again." };
  }
}

/**
 * Reads a book file I uploaded to Storage ("books" bucket): parse → chapters → save.
 * The browser uploads the file first (big files cannot pass through our server).
 * If the file cannot be read, it is deleted again and I get a clear message.
 */
export async function processUpload(
  path: string,
  fileName: string,
): Promise<ActionResult<{ bookId: string; title: string; chapters: number }>> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { ok: false, error: LOGIN_AGAIN };
  // Only my own folder, and only a file name we made: <user_id>/<uuid>.<ext>
  const ext = uploadExt(fileName);
  if (!ext || !new RegExp(`^${userId}/[0-9a-f-]{36}\\.${ext}$`).test(path)) {
    return { ok: false, error: "Something is wrong with this upload." };
  }

  const removeFile = () => supabase.storage.from("books").remove([path]);
  try {
    const { data: blob, error: downloadError } = await supabase.storage.from("books").download(path);
    if (downloadError || !blob) return { ok: false, error: "We could not find the uploaded file. Please upload it again." };

    const book = await parseBookFile(new Uint8Array(await blob.arrayBuffer()), fileName);
    const bookId = await saveBookWithChapters(
      supabase,
      {
        title: book.title,
        author: book.author,
        cover_url: null,
        source: "upload",
        level: levelFromChapters(book.chapters),
        genre: null,
        is_public_domain: false,
        file_path: path,
      },
      book.chapters,
    );
    return { ok: true, bookId, title: book.title, chapters: book.chapters.length };
  } catch (err) {
    await removeFile();
    if (err instanceof ParseError) return { ok: false, error: err.message };
    console.error(`processUpload(${fileName}) failed:`, err);
    return { ok: false, error: "Sorry, we could not read this file. Please try again." };
  }
}

/** Moves a book to "Want to read", "Reading now" or "Finished". */
export async function setBookStatus(bookId: string, status: ReadingStatus): Promise<ActionResult> {
  if (!isUuid(bookId) || !["want", "reading", "finished"].includes(status)) {
    return { ok: false, error: "Something is wrong with this book." };
  }
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { ok: false, error: LOGIN_AGAIN };

  const { error } = await supabase
    .from("reading_progress")
    .upsert(
      { user_id: userId, book_id: bookId, status, ...(status === "finished" ? { percent: 100 } : {}) },
      { onConflict: "user_id,book_id" },
    );
  if (error) {
    console.error("setBookStatus failed:", error);
    return { ok: false, error: "Sorry, we could not save that. Please try again." };
  }
  return { ok: true };
}

/** Deletes a book and its chapters and progress. */
export async function removeBook(bookId: string): Promise<ActionResult> {
  if (!isUuid(bookId)) return { ok: false, error: "Something is wrong with this book." };
  const supabase = await createClient();
  if (!(await currentUserId(supabase))) return { ok: false, error: LOGIN_AGAIN };

  // My uploaded file (if this book was an upload).
  const { data: bookRow } = await supabase.from("books").select("file_path").eq("id", bookId).maybeSingle();
  if (bookRow?.file_path) {
    const { error: fileError } = await supabase.storage.from("books").remove([bookRow.file_path]);
    if (fileError) console.error("removeBook: file cleanup failed:", fileError.message);
  }

  // Delete the book's "Listen" audio files first (the database rows go with the book).
  const { data: audio } = await supabase
    .from("audio_cache")
    .select("file_path, chapters!inner(book_id)")
    .eq("chapters.book_id", bookId)
    .limit(10000);
  const paths = (audio ?? []).map((a) => a.file_path as string);
  for (let i = 0; i < paths.length; i += 1000) {
    const { error: storageError } = await supabase.storage.from("audio").remove(paths.slice(i, i + 1000));
    if (storageError) console.error("removeBook: audio cleanup failed:", storageError.message);
  }

  const { error } = await supabase.from("books").delete().eq("id", bookId);
  if (error) {
    console.error("removeBook failed:", error);
    return { ok: false, error: "Sorry, we could not remove this book. Please try again." };
  }
  return { ok: true };
}

/** Finds books whose text contains the words (full-text search on chapters). Returns book ids. */
export async function searchInsideBooks(query: string): Promise<string[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 3) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("book_id")
    .textSearch("search", q, { type: "websearch", config: "english" })
    .limit(1000);
  if (error) {
    console.error("searchInsideBooks failed:", error);
    return [];
  }
  return [...new Set((data ?? []).map((r) => r.book_id as string))];
}
