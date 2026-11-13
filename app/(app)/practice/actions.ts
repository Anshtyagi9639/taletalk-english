"use server";

import { aiAction, chat, checkGrammar } from "@/lib/ai";
import { MISTAKE_TYPES, saveMistakes } from "@/lib/mistakes";
import type {
  PhraseSet,
  StoryTurn,
  Tone,
  TranslateDirection,
  TranslateResult,
  WhichAnswer,
  WordHelp,
  WritingResult,
} from "@/lib/practice";
import { TONES } from "@/lib/practice";
import { getProfile } from "@/lib/profile";
import {
  SITUATION_PHRASES,
  STORY_CONTINUE,
  STORY_STARTER,
  TRANSLATE_PRACTICE,
  WHICH_IS_CORRECT,
  WORD_HELPER,
  WRITING_CHECK,
} from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

type Fail = { ok: false; error: string };

const NOTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["wrong", "right", "type", "reason"],
  properties: {
    wrong: { type: "string" },
    right: { type: "string" },
    type: { type: "string", enum: [...MISTAKE_TYPES] },
    reason: { type: "string" },
  },
};

const clampScore = (n: number) => Math.min(10, Math.max(0, Math.round(Number(n) || 0)));

// ---------------------------------------------------------------------------
// 0. Translate & Learn (English ⇄ Hindi)
// ---------------------------------------------------------------------------

const TRANSLATE_SCHEMA = {
  name: "translate_practice",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["english", "hindi", "hindi_roman", "is_correct", "mistakes", "pattern", "word_map", "other_ways", "hindi_trap"],
    properties: {
      english: { type: "string" },
      hindi: { type: "string" },
      hindi_roman: { type: "string" },
      is_correct: { type: "boolean" },
      mistakes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["wrong", "right", "type", "reason", "reason_hindi"],
          properties: {
            wrong: { type: "string" },
            right: { type: "string" },
            type: { type: "string", enum: [...MISTAKE_TYPES] },
            reason: { type: "string" },
            reason_hindi: { type: "string" },
          },
        },
      },
      pattern: {
        type: "object",
        additionalProperties: false,
        required: ["formula", "name", "explain_hindi"],
        properties: { formula: { type: "string" }, name: { type: "string" }, explain_hindi: { type: "string" } },
      },
      word_map: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["hindi", "english"],
          properties: { hindi: { type: "string" }, english: { type: "string" } },
        },
      },
      other_ways: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["english", "when"],
          properties: { english: { type: "string" }, when: { type: "string" } },
        },
      },
      hindi_trap: { type: "string" },
    },
  },
};

/**
 * English → Hindi: correct my English + show it in Hindi.
 * Hindi → English: the right English (+ check "my try"), the sentence pattern, word map, other ways.
 * Hindi help is always on here. My English mistakes go to the notebook.
 */
export async function translatePractice(direction: TranslateDirection, text: string, myTry = "") {
  const t = text.trim();
  const mine = myTry.trim().slice(0, 1000);
  if (direction !== "en-hi" && direction !== "hi-en") return { ok: false as const, error: "Please choose a direction." };
  if (t.length < 2) return { ok: false as const, error: direction === "en-hi" ? "Please write an English sentence." : "कृपया हिंदी में एक वाक्य लिखें। (Please write a Hindi sentence.)" };
  if (t.length > 1000) return { ok: false as const, error: "Please write a shorter text (1-3 sentences)." };

  return aiAction(async () => {
    const profile = await getProfile();
    const res = await chat<TranslateResult>({
      feature: "practice.translate",
      task: TRANSLATE_PRACTICE,
      hindi: true,
      input: [
        `Direction: ${direction}`,
        `Learner's English level: ${profile.level}`,
        `Learner's text: ${t}`,
        direction === "hi-en" && mine ? `My try (the learner's own English): ${mine}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      schema: TRANSLATE_SCHEMA,
      maxTokens: 2500,
    });
    const result: TranslateResult = {
      ...res,
      mistakes: res.mistakes.slice(0, 10),
      word_map: res.word_map.slice(0, 8),
      other_ways: res.other_ways.slice(0, 3),
    };
    // Only MY English is checked (in Hindi → English, only when I gave a try).
    if (direction === "en-hi" || mine) {
      const supabase = await createClient();
      await saveMistakes(supabase, result.mistakes, "practice.translate");
    } else {
      result.mistakes = [];
      result.is_correct = true;
    }
    return result;
  });
}

// ---------------------------------------------------------------------------
// 1. Grammar Checker
// ---------------------------------------------------------------------------

export async function runGrammarCheck(text: string) {
  const t = text.trim();
  if (t.split(/\s+/).length < 2) return { ok: false as const, error: "Please write at least one sentence." };
  if (t.length > 6000) return { ok: false as const, error: "Please check a shorter text (up to about 900 words)." };
  return aiAction(async () => {
    const profile = await getProfile();
    const result = await checkGrammar(t, { feature: "practice.grammar", hindi: profile.hindiHelp });
    result.score = clampScore(result.score);
    const supabase = await createClient();
    await saveMistakes(supabase, result.mistakes, "practice.grammar");
    return result;
  });
}

// ---------------------------------------------------------------------------
// 2. Word & Sentence Helper
// ---------------------------------------------------------------------------

const WORD_SCHEMA = {
  name: "word_helper",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["meaning", "part_of_speech", "examples", "wrong_usage", "formal", "casual", "synonyms", "hindi"],
    properties: {
      meaning: { type: "string" },
      part_of_speech: { type: "string" },
      examples: {
        type: "object",
        additionalProperties: false,
        required: ["office", "friends", "interview"],
        properties: { office: { type: "string" }, friends: { type: "string" }, interview: { type: "string" } },
      },
      wrong_usage: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["wrong", "right", "reason"],
          properties: { wrong: { type: "string" }, right: { type: "string" }, reason: { type: "string" } },
        },
      },
      formal: { type: "string" },
      casual: { type: "string" },
      synonyms: { type: "array", items: { type: "string" } },
      hindi: { type: "string" },
    },
  },
};

export async function explainWord(input: string) {
  const t = input.trim();
  if (!t) return { ok: false as const, error: "Please type a word or phrase." };
  if (t.length > 200) return { ok: false as const, error: "Please type a shorter word, phrase or sentence." };
  return aiAction(async () => {
    const profile = await getProfile();
    return chat<WordHelp>({
      feature: "practice.word",
      task: WORD_HELPER,
      hindi: profile.hindiHelp,
      input: `Word or phrase: "${t}"\nLearner level: ${profile.level}\nHindi help: ${profile.hindiHelp ? "yes" : "no"}`,
      schema: WORD_SCHEMA,
      maxTokens: 1500,
    });
  });
}

const WHICH_SCHEMA = {
  name: "which_is_correct",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["correct", "best", "explanation", "examples", "tip"],
    properties: {
      correct: { type: "string", enum: ["A", "B", "both", "neither"] },
      best: { type: "string" },
      explanation: { type: "string" },
      examples: { type: "array", items: { type: "string" } },
      tip: { type: "string" },
    },
  },
};

export async function whichIsCorrect(a: string, b: string, context: string) {
  const A = a.trim().slice(0, 200);
  const B = b.trim().slice(0, 200);
  if (!A || !B) return { ok: false as const, error: "Please type both options." };
  return aiAction(async () => {
    const profile = await getProfile();
    return chat<WhichAnswer>({
      feature: "practice.which",
      task: WHICH_IS_CORRECT,
      hindi: profile.hindiHelp,
      input: `A: "${A}"\nB: "${B}"${context.trim() ? `\nWhere I want to use it: ${context.trim().slice(0, 200)}` : ""}`,
      schema: WHICH_SCHEMA,
      maxTokens: 1200,
    });
  });
}

// ---------------------------------------------------------------------------
// 3. Situation Phrases
// ---------------------------------------------------------------------------

const PHRASES_SCHEMA = {
  name: "situation_phrases",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["phrases", "dont_say"],
    properties: {
      phrases: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["phrase", "when"],
          properties: { phrase: { type: "string" }, when: { type: "string" } },
        },
      },
      dont_say: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["dont", "say", "reason"],
          properties: { dont: { type: "string" }, say: { type: "string" }, reason: { type: "string" } },
        },
      },
    },
  },
};

export async function getSituationPhrases(situation: string, tone: Tone) {
  const s = situation.trim().slice(0, 150);
  const toneLabel = TONES.find((t) => t.id === tone)?.label;
  if (!s || !toneLabel) return { ok: false as const, error: "Please choose a situation and a tone." };
  return aiAction(async () => {
    const profile = await getProfile();
    const res = await chat<PhraseSet>({
      feature: "practice.phrases",
      task: SITUATION_PHRASES,
      hindi: profile.hindiHelp,
      input: `Situation: ${s}\nTone: ${toneLabel}\nLearner level: ${profile.level}`,
      schema: PHRASES_SCHEMA,
      maxTokens: 2000,
    });
    return { phrases: res.phrases.slice(0, 10), dont_say: res.dont_say.slice(0, 4) };
  });
}

/** Saves a phrase to my favourites ("already" if I saved it before). */
export async function savePhrase(situation: string, phrase: string, note: string) {
  const p = phrase.trim().slice(0, 300);
  if (!p) return { ok: false as const, error: "Nothing to save." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_phrases")
    .insert({ situation: situation.trim().slice(0, 150) || "General", phrase: p, usage_note: note.trim().slice(0, 300) || null });
  if (error?.code === "23505") return { ok: true as const, already: true };
  if (error) return { ok: false as const, error: "Could not save. Please try again." };
  return { ok: true as const, already: false };
}

export async function deletePhrase(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("saved_phrases").delete().eq("id", id);
  return { ok: !error };
}

// ---------------------------------------------------------------------------
// 4. Writing practice
// ---------------------------------------------------------------------------

const WRITING_SCHEMA = {
  name: "writing_check",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["paragraphs", "overall", "score", "tip"],
    properties: {
      paragraphs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["corrected", "notes"],
          properties: { corrected: { type: "string" }, notes: { type: "array", items: NOTE_SCHEMA } },
        },
      },
      overall: { type: "string" },
      score: { type: "integer" },
      tip: { type: "string" },
    },
  },
};

/** Corrects my writing paragraph by paragraph (max 8 paragraphs / ~900 words). */
export async function checkWriting(text: string, topic: string): Promise<{ ok: true; data: WritingResult } | Fail> {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (paragraphs.length === 0 || text.trim().split(/\s+/).length < 5) return { ok: false, error: "Please write a few sentences first." };
  if (paragraphs.length > 8 || text.length > 6000) return { ok: false, error: "Please write up to 8 paragraphs (about 900 words)." };

  return aiAction(async () => {
    const profile = await getProfile();
    const res = await chat<Omit<WritingResult, "paragraphs"> & { paragraphs: { corrected: string; notes: WritingResult["paragraphs"][number]["notes"] }[] }>({
      feature: "practice.writing",
      task: WRITING_CHECK,
      hindi: profile.hindiHelp,
      input: `${topic.trim() ? `Topic: ${topic.trim().slice(0, 200)}\n\n` : ""}${paragraphs.map((p, i) => `Paragraph ${i + 1}:\n${p}`).join("\n\n")}`,
      schema: WRITING_SCHEMA,
      maxTokens: 5000,
    });
    // Match the AI's paragraphs to mine (same order).
    const result: WritingResult = {
      paragraphs: paragraphs.map((original, i) => ({
        original,
        corrected: res.paragraphs[i]?.corrected?.trim() || original,
        notes: res.paragraphs[i]?.notes ?? [],
      })),
      overall: res.overall,
      score: clampScore(res.score),
      tip: res.tip,
    };
    const supabase = await createClient();
    await saveMistakes(supabase, result.paragraphs.flatMap((p) => p.notes), "practice.writing");
    return result;
  });
}

const STARTER_SCHEMA = {
  name: "story_starter",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "opening"],
    properties: { title: { type: "string" }, opening: { type: "string" } },
  },
};

/** "Write a story": the AI writes the first lines. */
export async function startStoryTogether() {
  return aiAction(async () => {
    const profile = await getProfile();
    return chat<{ title: string; opening: string }>({
      feature: "practice.story",
      task: STORY_STARTER,
      input: `Learner level: ${profile.level}. Interests: ${profile.interests.join(", ") || "anything"}.`,
      schema: STARTER_SCHEMA,
      maxTokens: 800,
    });
  });
}

const TURN_SCHEMA = {
  name: "story_turn",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["corrected", "notes", "praise", "next_part"],
    properties: {
      corrected: { type: "string" },
      notes: { type: "array", items: NOTE_SCHEMA },
      praise: { type: "string" },
      next_part: { type: "string" },
    },
  },
};

/** "Write a story": correct my part and continue the story. */
export async function continueStoryTogether(storySoFar: string, myPart: string) {
  const mine = myPart.trim();
  if (mine.split(/\s+/).length < 3) return { ok: false as const, error: "Please write at least one sentence." };
  if (mine.length > 2000) return { ok: false as const, error: "Please write a shorter part (up to about 300 words)." };
  return aiAction(async () => {
    const profile = await getProfile();
    const turn = await chat<StoryTurn>({
      feature: "practice.story",
      task: STORY_CONTINUE,
      hindi: profile.hindiHelp,
      input: `Learner level: ${profile.level}\n\nStory so far:\n${storySoFar.slice(-6000)}\n\nThe learner's new part:\n${mine}`,
      schema: TURN_SCHEMA,
      maxTokens: 2000,
    });
    const supabase = await createClient();
    await saveMistakes(supabase, turn.notes, "practice.story");
    return turn;
  });
}
