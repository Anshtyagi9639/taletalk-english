"use server";

import { aiAction, chat } from "@/lib/ai";
import { PHONETIC_HELP } from "@/lib/prompts";
import { getContinueReading } from "@/lib/reader/queries";
import { createClient } from "@/lib/supabase/server";
import { isSpeakable, sentenceRanges } from "@/lib/text/sentences";

export type StorySentence = { text: string; p: number; s: number };

/**
 * Sentences to practise from the book I am reading now, starting where I stopped.
 * Good length only (5-25 words). `p`/`s` let the Listen button use the cached story audio.
 */
export async function getStorySentences(): Promise<
  { ok: true; bookTitle: string; chapterId: string; sentences: StorySentence[] } | { ok: false; error: string }
> {
  const current = (await getContinueReading(1))[0];
  if (!current) return { ok: false, error: "You are not reading a book right now. Start one in the Library, or use the other sentences." };

  const supabase = await createClient();
  const { data: progress } = await supabase
    .from("reading_progress")
    .select("chapter_id, position")
    .eq("book_id", current.bookId)
    .maybeSingle();
  const { data: chapter } = progress?.chapter_id
    ? await supabase.from("chapters").select("id, content").eq("id", progress.chapter_id).maybeSingle()
    : { data: null };
  if (!chapter) return { ok: false, error: "We could not find where you are in the book." };

  const paragraphs = (chapter.content as string).split("\n\n");
  const out: StorySentence[] = [];
  const start = Math.max(0, Math.min(paragraphs.length - 1, progress?.position ?? 0));
  for (let p = start; p < paragraphs.length && out.length < 12; p++) {
    sentenceRanges(paragraphs[p]).forEach(([a, b], s) => {
      const text = paragraphs[p].slice(a, b).trim();
      const words = text.split(/\s+/).length;
      if (out.length < 12 && isSpeakable(text) && words >= 5 && words <= 25 && !text.includes("\n")) out.push({ text, p, s });
    });
  }
  if (out.length === 0) return { ok: false, error: "No good sentences found here. Try the everyday sentences." };
  return { ok: true, bookTitle: current.title, chapterId: chapter.id, sentences: out };
}

export type SoundTip = { word: string; sounds: string; tip: string };

const PHONETIC_SCHEMA = {
  name: "phonetic_help",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["words"],
    properties: {
      words: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["word", "sounds", "tip"],
          properties: { word: { type: "string" }, sounds: { type: "string" }, tip: { type: "string" } },
        },
      },
    },
  },
};

/** "How to say it" for up to 6 words. */
export async function getPhoneticHelp(words: string[]) {
  const list = [...new Set(words.map((w) => w.replace(/[^A-Za-z'’-]/g, "")).filter(Boolean))].slice(0, 6);
  if (list.length === 0) return { ok: false as const, error: "No words to explain." };
  return aiAction(async () => {
    const res = await chat<{ words: SoundTip[] }>({
      feature: "speak.phonetic",
      task: PHONETIC_HELP,
      input: list.join(", "),
      schema: PHONETIC_SCHEMA,
      maxTokens: 1000,
    });
    return res.words;
  });
}
