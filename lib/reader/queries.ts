import "server-only";
import { isUuid } from "@/lib/books/queries";
import { createClient } from "@/lib/supabase/server";
import { BROWSER_VOICE, isValidVoice, SPEEDS } from "@/lib/voices";

export type ReaderChapter = {
  book: { id: string; title: string; author: string | null; chapter_count: number };
  chapter: { id: string; number: number; title: string; content: string; word_count: number };
  /** All chapter titles in order (for the chapter picker). */
  chapterTitles: string[];
  /** Where I stopped last time in THIS chapter (paragraph index), or null. */
  resumeAt: number | null;
};

/** One chapter for the Reader. Null if the book or chapter does not exist. */
export async function getReaderChapter(bookId: string, number: number): Promise<ReaderChapter | null> {
  if (!isUuid(bookId) || !Number.isInteger(number) || number < 1) return null;
  const supabase = await createClient();

  const [bookRes, chapterRes, progressRes, titlesRes] = await Promise.all([
    supabase.from("books").select("id, title, author, chapter_count").eq("id", bookId).maybeSingle(),
    supabase
      .from("chapters")
      .select("id, number, title, content, word_count")
      .eq("book_id", bookId)
      .eq("number", number)
      .maybeSingle(),
    supabase.from("reading_progress").select("chapter_id, position").eq("book_id", bookId).maybeSingle(),
    supabase.from("chapters").select("title").eq("book_id", bookId).order("number").limit(1000),
  ]);
  if (bookRes.error || chapterRes.error) {
    throw new Error(`Could not load the chapter: ${(bookRes.error ?? chapterRes.error)?.message}`);
  }
  if (!bookRes.data || !chapterRes.data) return null;

  const progress = progressRes.data;
  return {
    book: bookRes.data,
    chapter: chapterRes.data,
    chapterTitles: (titlesRes.data ?? []).map((c) => c.title as string),
    resumeAt: progress && progress.chapter_id === chapterRes.data.id ? progress.position : null,
  };
}

export type ContinueItem = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  percent: number;
  chapterNumber: number;
  chapterTitle: string | null;
};

/** Books I am reading now, most recent first (for "Continue reading"). */
export async function getContinueReading(limit = 5): Promise<ContinueItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reading_progress")
    .select("book_id, percent, updated_at, books(title, author, cover_url), chapters(number, title)")
    .eq("status", "reading")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Could not load reading progress: ${error.message}`);

  type Row = {
    book_id: string;
    percent: number;
    books: { title: string; author: string | null; cover_url: string | null } | null;
    chapters: { number: number; title: string } | null;
  };
  return (data as unknown as Row[])
    .filter((r) => r.books)
    .map((r) => ({
      bookId: r.book_id,
      title: r.books!.title,
      author: r.books!.author,
      coverUrl: r.books!.cover_url,
      percent: Number(r.percent),
      chapterNumber: r.chapters?.number ?? 1,
      chapterTitle: r.chapters?.title ?? null,
    }));
}

/** My "Listen" settings from my profile (voice + speed). */
export async function getVoicePrefs(): Promise<{ voice: string; speed: number }> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("voice, tts_speed").maybeSingle();
  const voice = isValidVoice(data?.voice ?? "") ? (data!.voice as string) : BROWSER_VOICE;
  const speed = SPEEDS.find((s) => s === Number(data?.tts_speed)) ?? 1;
  return { voice, speed };
}

/** Chapter number to open for a book: where I stopped, or chapter 1. */
export async function getResumeChapterNumber(bookId: string): Promise<number> {
  if (!isUuid(bookId)) return 1;
  const supabase = await createClient();
  const { data } = await supabase
    .from("reading_progress")
    .select("chapters(number)")
    .eq("book_id", bookId)
    .maybeSingle();
  const row = data as unknown as { chapters: { number: number } | null } | null;
  return row?.chapters?.number ?? 1;
}
