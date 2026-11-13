"use server";

import { aiAction, AiError, chat } from "@/lib/ai";
import { countWords } from "@/lib/books/split";
import { LEVELS, type Level } from "@/lib/books/types";
import { STORY_WRITER } from "@/lib/prompts";
import { cleanKeyWords, cleanQuestions, KEY_WORD_SCHEMA, QUESTION_SCHEMA, type KeyWord, type QuizQuestion } from "@/lib/quiz";
import { createClient } from "@/lib/supabase/server";
import { STORY_TOPICS, type StoryTopic } from "@/lib/topics";

/** Story length in minutes → about how many words (learners read ~150 words a minute). */
const LENGTHS = { 2: 300, 5: 750, 10: 1500 } as const;
export type StoryLength = keyof typeof LENGTHS;

type StoryAnswer = {
  title: string;
  teaser: string;
  paragraphs: string[];
  key_words: KeyWord[];
  questions: QuizQuestion[];
};

const STORY_SCHEMA = {
  name: "practice_story",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "teaser", "paragraphs", "key_words", "questions"],
    properties: {
      title: { type: "string" },
      teaser: { type: "string" },
      paragraphs: { type: "array", items: { type: "string" } },
      key_words: { type: "array", items: KEY_WORD_SCHEMA },
      questions: { type: "array", items: QUESTION_SCHEMA },
    },
  },
};

/** Writes an original practice story and saves it as a book with one chapter. */
export async function createStory(input: {
  level: Level;
  topic: StoryTopic;
  minutes: StoryLength;
}): Promise<{ ok: true; bookId: string } | { ok: false; error: string }> {
  const topic = STORY_TOPICS.find((t) => t.id === input.topic);
  const words = LENGTHS[input.minutes];
  if (!LEVELS.includes(input.level) || !topic || !words) return { ok: false, error: "Please choose level, topic and length." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "Please log in again." };

  const result = await aiAction(async () => {
    const story = await chat<StoryAnswer>({
      feature: "story.create",
      task: STORY_WRITER,
      input: `Level: ${input.level}. Topic: ${topic.label}. Length: about ${words} words (${input.minutes} minutes of reading).`,
      schema: STORY_SCHEMA,
      maxTokens: 6000,
    });
    const paragraphs = story.paragraphs.map((p) => p.trim()).filter(Boolean);
    if (countWords(paragraphs.join(" ")) < 80) throw new AiError("The story came out too short. Please try again.");
    return { ...story, paragraphs };
  });
  if (!result.ok) return { ok: false, error: result.error };
  const story = result.data;
  const content = story.paragraphs.join("\n\n");
  const wordCount = countWords(content);

  const { data: book, error } = await supabase
    .from("books")
    .insert({
      title: story.title.slice(0, 200) || `${topic.label} story`,
      author: "TaleTalk AI",
      source: "ai",
      level: input.level,
      genre: topic.label,
      is_public_domain: false,
      summary: story.teaser.slice(0, 500),
      word_count: wordCount,
      chapter_count: 1,
    })
    .select("id")
    .single();
  if (error) {
    console.error("createStory: book insert failed:", error.message);
    return { ok: false, error: "Could not save the story. Please try again." };
  }

  const { error: chapterError } = await supabase.from("chapters").insert({
    book_id: book.id,
    number: 1,
    title: story.title.slice(0, 200),
    content,
    word_count: wordCount,
    questions: cleanQuestions(story.questions),
    key_words: cleanKeyWords(story.key_words),
  });
  if (chapterError) {
    console.error("createStory: chapter insert failed:", chapterError.message);
    await supabase.from("books").delete().eq("id", book.id);
    return { ok: false, error: "Could not save the story. Please try again." };
  }
  await supabase.from("reading_progress").insert({ book_id: book.id, status: "want" });
  return { ok: true, bookId: book.id };
}
