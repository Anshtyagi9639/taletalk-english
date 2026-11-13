"use server";

import { aiAction, chat } from "@/lib/ai";
import { isUuid } from "@/lib/books/queries";
import { MISTAKE_TYPES, saveMistakes } from "@/lib/mistakes";
import { CHAPTER_CHECK, EXPLAIN_SIMPLY, RETELL_CHECK, SENTENCE_GRAMMAR, TRANSLATE_HINDI, WORD_HELP } from "@/lib/prompts";
import { cleanKeyWords, cleanQuestions, KEY_WORD_SCHEMA, QUESTION_SCHEMA, type KeyWord, type QuizQuestion } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import { isValidVoice, SPEEDS } from "@/lib/voices";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Reading progress
// ---------------------------------------------------------------------------

/**
 * Saves where I am (paragraph), how far I am in the book (%), and new reading minutes.
 * `localDate` is today's date on my device (YYYY-MM-DD), for the daily streak.
 */
export async function saveReadingProgress(input: {
  bookId: string;
  chapterId: string;
  position: number;
  percent: number;
  finished: boolean;
  minutes: number;
  localDate: string;
}): Promise<Result> {
  const { bookId, chapterId, position, percent, finished, minutes, localDate } = input;
  if (!isUuid(bookId) || !isUuid(chapterId) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return { ok: false, error: "Bad progress data." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_reading_progress", {
    p_book_id: bookId,
    p_chapter_id: chapterId,
    p_position: Math.max(0, Math.floor(position)),
    p_percent: Math.min(100, Math.max(0, Number(percent.toFixed(2)))),
    p_finished: finished,
    p_minutes: Math.min(60, Math.max(0, Math.floor(minutes))), // at most 60 new minutes per save
    p_date: localDate,
  });
  if (error) {
    console.error("saveReadingProgress failed:", error.message);
    return { ok: false, error: "Could not save your reading place." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Listen settings
// ---------------------------------------------------------------------------

/** Saves my voice ("browser" or a natural Kokoro voice) and speed in my profile. */
export async function saveVoicePrefs(voice: string, speed: number): Promise<Result> {
  if (!isValidVoice(voice) || !SPEEDS.some((s) => s === speed)) return { ok: false, error: "Unknown voice or speed." };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return { ok: false, error: "Please log in again." };
  const { error } = await supabase
    .from("profiles")
    .upsert({ user_id: userId, voice, tts_speed: speed }, { onConflict: "user_id" });
  if (error) {
    console.error("saveVoicePrefs failed:", error.message);
    return { ok: false, error: "Could not save your voice choice." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Tap a word
// ---------------------------------------------------------------------------

export type WordInfo = {
  base_form: string;
  part_of_speech: string;
  phonetic: string;
  meaning_here: string;
  example: string;
  note: string;
  hindi: string;
};

const WORD_SCHEMA = {
  name: "word_help",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["base_form", "part_of_speech", "phonetic", "meaning_here", "example", "note", "hindi"],
    properties: {
      base_form: { type: "string" },
      part_of_speech: { type: "string" },
      phonetic: { type: "string" },
      meaning_here: { type: "string" },
      example: { type: "string" },
      note: { type: "string" },
      hindi: { type: "string" },
    },
  },
};

/** "Also explain in Hindi" setting from my profile. */
async function wantsHindi() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("hindi_help").maybeSingle();
  return Boolean(data?.hindi_help);
}

export async function lookupWord(word: string, sentence: string) {
  const w = word.trim().slice(0, 40);
  if (!/^[A-Za-z][A-Za-z'’-]*$/.test(w)) return { ok: false as const, error: "Please tap on a word." };
  return aiAction(async () => {
    const hindi = await wantsHindi();
    return chat<WordInfo>({
      feature: "reader.word",
      task: WORD_HELP,
      hindi,
      input: `Word: "${w}"\nSentence: "${sentence.trim().slice(0, 600)}"\nHindi help: ${hindi ? "yes" : "no"}`,
      schema: WORD_SCHEMA,
      maxTokens: 800,
    });
  });
}

/** Saves a word to my word list (flashcards). First review: tomorrow. */
export async function saveWord(input: {
  word: string;
  meaning: string;
  example: string;
  phonetic: string;
  hindi: string;
  sentence: string;
  bookId: string | null;
}): Promise<Result<{ already: boolean }>> {
  const word = input.word.trim().toLowerCase().slice(0, 60);
  if (!word || !input.meaning.trim()) return { ok: false, error: "Nothing to save." };
  const supabase = await createClient();
  const { error } = await supabase.from("saved_words").insert({
    word,
    meaning: input.meaning.slice(0, 500),
    example: input.example.slice(0, 500) || null,
    phonetic: input.phonetic.slice(0, 100) || null,
    hindi: input.hindi.slice(0, 300) || null,
    sentence: input.sentence.slice(0, 600) || null,
    source_book_id: input.bookId && isUuid(input.bookId) ? input.bookId : null,
  });
  if (error?.code === "23505") return { ok: true, already: true }; // already in my list
  if (error) {
    console.error("saveWord failed:", error.message);
    return { ok: false, error: "Could not save the word. Please try again." };
  }
  return { ok: true, already: false };
}

// ---------------------------------------------------------------------------
// End of chapter: summary + questions + "tell the story in your own words"
// ---------------------------------------------------------------------------

export type ChapterCheck = { summary: string | null; questions: QuizQuestion[]; keyWords: KeyWord[] };

type CheckAnswer = { summary: string; questions: QuizQuestion[]; key_words: KeyWord[] };

const CHECK_SCHEMA = {
  name: "chapter_check",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "questions", "key_words"],
    properties: {
      summary: { type: "string" },
      questions: { type: "array", items: QUESTION_SCHEMA },
      key_words: { type: "array", items: KEY_WORD_SCHEMA },
    },
  },
};

/** Long chapters: we send at most this much text to the AI. */
const MAX_CHAPTER_CHARS = 40_000;

/** Summary + 3 questions + key words. Made once per chapter, then read from the database. */
export async function getChapterCheck(chapterId: string) {
  if (!isUuid(chapterId)) return { ok: false as const, error: "Chapter not found." };
  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from("chapters")
    .select("title, content, summary, questions, key_words")
    .eq("id", chapterId)
    .maybeSingle();
  if (!chapter) return { ok: false as const, error: "Chapter not found." };

  const cached = cleanQuestions(chapter.questions);
  if (cached.length > 0) {
    return {
      ok: true as const,
      data: { summary: chapter.summary, questions: cached, keyWords: cleanKeyWords(chapter.key_words) } satisfies ChapterCheck,
    };
  }

  return aiAction(async () => {
    const answer = await chat<CheckAnswer>({
      feature: "reader.check",
      task: CHAPTER_CHECK,
      input: `Chapter: ${chapter.title}\n\n${chapter.content.slice(0, MAX_CHAPTER_CHARS)}`,
      schema: CHECK_SCHEMA,
      maxTokens: 3000,
    });
    const check: ChapterCheck = {
      summary: answer.summary.trim() || null,
      questions: cleanQuestions(answer.questions),
      keyWords: cleanKeyWords(answer.key_words),
    };
    // Cache it on the chapter (so we never pay twice).
    await supabase
      .from("chapters")
      .update({ summary: check.summary, questions: check.questions, key_words: check.keyWords })
      .eq("id", chapterId);
    return check;
  });
}

export type RetellResult = {
  content_feedback: string;
  corrected: string;
  mistakes: { wrong: string; right: string; type: string; reason: string }[];
  score: number;
};

const RETELL_SCHEMA = {
  name: "retell_check",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["content_feedback", "corrected", "mistakes", "score"],
    properties: {
      content_feedback: { type: "string" },
      corrected: { type: "string" },
      mistakes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["wrong", "right", "type", "reason"],
          properties: {
            wrong: { type: "string" },
            right: { type: "string" },
            type: { type: "string", enum: [...MISTAKE_TYPES] },
            reason: { type: "string" },
          },
        },
      },
      score: { type: "integer" },
    },
  },
};

/** Checks my retelling of the chapter: understanding + English. Mistakes go to my notebook. */
export async function checkRetelling(chapterId: string, text: string) {
  const t = text.trim();
  if (!isUuid(chapterId)) return { ok: false as const, error: "Chapter not found." };
  if (t.split(/\s+/).length < 5) return { ok: false as const, error: "Please write a few sentences (at least 5 words)." };
  if (t.length > 3000) return { ok: false as const, error: "Please write a shorter text (up to about 400 words)." };

  const supabase = await createClient();
  const { data: chapter } = await supabase.from("chapters").select("title, summary, content").eq("id", chapterId).maybeSingle();
  if (!chapter) return { ok: false as const, error: "Chapter not found." };

  return aiAction(async () => {
    const hindi = await wantsHindi();
    const about = chapter.summary ?? chapter.content.slice(0, 8000);
    const result = await chat<RetellResult>({
      feature: "reader.retell",
      task: RETELL_CHECK,
      hindi,
      input: `Chapter: ${chapter.title}\nWhat happens: ${about}\n\nThe learner's retelling:\n${t}`,
      schema: RETELL_SCHEMA,
      maxTokens: 2500,
    });
    result.score = Math.min(10, Math.max(0, Math.round(result.score)));
    await saveMistakes(supabase, result.mistakes, "reader.retell");
    return result;
  });
}

// ---------------------------------------------------------------------------
// Select a sentence
// ---------------------------------------------------------------------------

export type SentenceHelp = "explain" | "hindi" | "grammar";

const SENTENCE_TASKS: Record<SentenceHelp, string> = {
  explain: EXPLAIN_SIMPLY,
  hindi: TRANSLATE_HINDI,
  grammar: SENTENCE_GRAMMAR,
};

export async function explainSelection(kind: SentenceHelp, text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (!(kind in SENTENCE_TASKS)) return { ok: false as const, error: "Unknown action." };
  if (t.length < 2) return { ok: false as const, error: "Please select a sentence first." };
  if (t.length > 800) return { ok: false as const, error: "Please select a shorter part (one or two sentences)." };
  return aiAction(async () => {
    const hindi = kind === "hindi" ? false : await wantsHindi(); // the Hindi task is already in Hindi
    return chat({ feature: `reader.${kind}`, task: SENTENCE_TASKS[kind], hindi, input: t, maxTokens: 1200 });
  });
}
