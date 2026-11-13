"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchResults = {
  books: { id: string; title: string; author: string | null; level: string | null }[];
  words: { id: string; word: string; meaning: string }[];
  phrases: { id: string; phrase: string; situation: string }[];
};

const EMPTY: SearchResults = { books: [], words: [], phrases: [] };

/** Global search: my books (title/author), saved words and saved phrases. RLS keeps it to my own rows. */
export async function searchEverything(query: string): Promise<SearchResults> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2) return EMPTY;
  // Drop the characters that mean something in a LIKE pattern or a PostgREST filter.
  const clean = q.replace(/[\\%_,()"*:.]/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length < 2) return EMPTY;
  const like = `"%${clean}%"`;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return EMPTY;

  const [books, words, phrases] = await Promise.all([
    supabase.from("books").select("id, title, author, level").or(`title.ilike.${like},author.ilike.${like}`).order("title").limit(6),
    supabase.from("saved_words").select("id, word, meaning").or(`word.ilike.${like},meaning.ilike.${like}`).order("word").limit(6),
    supabase.from("saved_phrases").select("id, phrase, situation").or(`phrase.ilike.${like},situation.ilike.${like}`).limit(6),
  ]);

  return {
    books: books.data ?? [],
    words: words.data ?? [],
    phrases: phrases.data ?? [],
  };
}
