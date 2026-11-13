import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewBook } from "./queries";
import type { ChapterDraft } from "./types";

/** How many chapters we send to the database in one request. */
const BATCH = 20;

/**
 * Saves a book and all its chapters for the logged-in user.
 * If saving a chapter fails, the half-saved book is removed again.
 * Returns the new book id.
 */
export async function saveBookWithChapters(
  supabase: SupabaseClient,
  book: NewBook,
  chapters: ChapterDraft[],
): Promise<string> {
  const wordCount = chapters.reduce((sum, c) => sum + c.wordCount, 0);
  const { data, error } = await supabase
    .from("books")
    .insert({ ...book, word_count: wordCount, chapter_count: chapters.length })
    .select("id")
    .single();
  if (error) throw error;
  const bookId = data.id as string;

  try {
    for (let i = 0; i < chapters.length; i += BATCH) {
      const rows = chapters.slice(i, i + BATCH).map((c, j) => ({
        book_id: bookId,
        number: i + j + 1,
        title: c.title.slice(0, 300),
        content: c.content,
        word_count: c.wordCount,
      }));
      const { error: chapterError } = await supabase.from("chapters").insert(rows);
      if (chapterError) throw chapterError;
    }
    const { error: progressError } = await supabase
      .from("reading_progress")
      .insert({ book_id: bookId, status: "want" });
    if (progressError) throw progressError;
  } catch (err) {
    await supabase.from("books").delete().eq("id", bookId);
    throw err;
  }
  return bookId;
}
