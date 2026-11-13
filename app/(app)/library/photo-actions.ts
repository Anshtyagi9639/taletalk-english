"use server";

import { aiAction, AiError, chat, readImage } from "@/lib/ai";
import { searchClassics } from "@/lib/books/gutenberg";
import { matchScore } from "@/lib/books/match";
import { getOpenLibraryWork, searchOpenLibraryByTitle } from "@/lib/books/openlibrary";
import { LEVELS, type GutenbergResult, type Level, type OpenLibraryResult } from "@/lib/books/types";
import { BOOK_PHOTO, BOOK_SUMMARY } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// 1. Photo → title + author
// ---------------------------------------------------------------------------

export type PhotoReading = {
  is_book: boolean;
  title: string;
  subtitle: string;
  author: string;
  confidence: "high" | "medium" | "low";
  note: string;
};

const PHOTO_SCHEMA = {
  name: "book_photo",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["is_book", "title", "subtitle", "author", "confidence", "note"],
    properties: {
      is_book: { type: "boolean" },
      title: { type: "string" },
      subtitle: { type: "string" },
      author: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
      note: { type: "string" },
    },
  },
};

/** Max size of the photo we accept (the browser makes it smaller first). */
const MAX_IMAGE_CHARS = 1_400_000;

export async function readBookPhoto(imageDataUrl: string) {
  if (imageDataUrl.length > MAX_IMAGE_CHARS) return { ok: false as const, error: "This photo is too big. Please try again." };
  const m = imageDataUrl.match(/^data:image\/(?:jpeg|png|webp);base64,(.+)$/);
  if (!m || !/^[A-Za-z0-9+/]+=*$/.test(m[1])) return { ok: false as const, error: "Please choose a photo (JPG or PNG)." };

  return aiAction(async () => {
    const reading = await readImage<PhotoReading>({
      feature: "photo.read",
      task: BOOK_PHOTO,
      image: imageDataUrl,
      question: "What book is this? Read the title and author.",
      schema: PHOTO_SCHEMA,
    });
    if (!reading.is_book || !reading.title.trim()) {
      throw new AiError(reading.note || "We could not see a book in this photo. Try again with the cover in good light.");
    }
    return reading;
  });
}

// ---------------------------------------------------------------------------
// 2. Title + author → matches (free full books + book info)
// ---------------------------------------------------------------------------

export type BookMatches = { classics: GutenbergResult[]; info: OpenLibraryResult[] };

export async function findBookMatches(title: string, author: string): Promise<{ ok: true; data: BookMatches } | { ok: false; error: string }> {
  const t = title.trim().slice(0, 200);
  const a = author.trim().slice(0, 100) || null;
  if (t.length < 2) return { ok: false, error: "Please type the book title." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "Please log in again." };

  const [classics, info] = await Promise.allSettled([
    searchClassics(a ? `${t} ${a}` : t, "all"),
    searchOpenLibraryByTitle(t, a),
  ]);
  if (classics.status === "rejected" && info.status === "rejected") {
    return { ok: false, error: "The book services are not answering. Please try again in a minute." };
  }

  // Keep only good matches, best first.
  const rank = <T extends { title: string; author: string | null }>(list: T[]) =>
    list
      .map((b) => ({ b, score: matchScore(t, a, b.title, b.author) }))
      .filter((x) => x.score >= 0.5)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.b);

  return {
    ok: true,
    data: {
      classics: rank(classics.status === "fulfilled" ? classics.value.results : []).slice(0, 5),
      info: rank(info.status === "fulfilled" ? info.value : []).slice(0, 5),
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Save a book that is still under copyright: info + AI summary + links (no text)
// ---------------------------------------------------------------------------

type SummaryAnswer = { summary: string; level: Level; level_reason: string; genre: string; known: boolean };

const SUMMARY_SCHEMA = {
  name: "book_summary",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "level", "level_reason", "genre", "known"],
    properties: {
      summary: { type: "string" },
      level: { type: "string", enum: [...LEVELS] },
      level_reason: { type: "string" },
      genre: { type: "string" },
      known: { type: "boolean" },
    },
  },
};

export async function addInfoOnlyBook(input: {
  key: string;
  title: string;
  author: string | null;
  year: number | null;
}): Promise<{ ok: true; bookId: string; already: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "Please log in again." };

  const url = `https://openlibrary.org${input.key}`;
  const { data: existing } = await supabase.from("books").select("id").eq("external_url", url).maybeSingle();
  if (existing) return { ok: true, bookId: existing.id, already: true };

  let work;
  try {
    work = await getOpenLibraryWork(input.key);
  } catch {
    return { ok: false, error: "Open Library is not answering. Please try again in a minute." };
  }
  if (!work) return { ok: false, error: "We could not find this book on Open Library." };

  const title = (work.title || input.title).slice(0, 300);
  const author = input.author?.slice(0, 200) ?? null;

  const answer = await aiAction(() =>
    chat<SummaryAnswer>({
      feature: "photo.summary",
      task: BOOK_SUMMARY,
      input: [
        `Book: "${title}"${author ? ` by ${author}` : ""}${input.year ? ` (first published ${input.year})` : ""}.`,
        work.subjects.length ? `Subjects: ${work.subjects.join(", ")}.` : "",
        work.description ? `Short description (background only, do not copy it): ${work.description}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      schema: SUMMARY_SCHEMA,
      maxTokens: 1500,
    }),
  );
  if (!answer.ok) return { ok: false, error: answer.error };

  const { data, error } = await supabase
    .from("books")
    .insert({
      title,
      author,
      cover_url: work.coverUrl,
      source: "info_only",
      level: answer.data.level,
      level_reason: answer.data.level_reason.slice(0, 300),
      genre: answer.data.genre.slice(0, 40) || null,
      is_public_domain: false,
      summary: answer.data.summary.slice(0, 4000),
      external_url: url,
      published_year: input.year,
    })
    .select("id")
    .single();
  if (error) {
    console.error("addInfoOnlyBook failed:", error.message);
    return { ok: false, error: "Could not save the book. Please try again." };
  }
  // So it shows in the "Want to read" tab.
  await supabase.from("reading_progress").insert({ book_id: data.id, status: "want" });
  return { ok: true, bookId: data.id, already: false };
}
