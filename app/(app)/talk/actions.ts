"use server";

import type { AiMessage } from "@/lib/ai";
import { aiAction, chat } from "@/lib/ai";
import { isUuid } from "@/lib/books/queries";
import { MISTAKE_TYPES, saveMistakes } from "@/lib/mistakes";
import { getProfile } from "@/lib/profile";
import { TALK_OPENING, TALK_SUMMARY, talkPartner } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";
import {
  describeSetup,
  MAX_TALK_MESSAGES,
  type TalkCorrection,
  type TalkMessage,
  type TalkSetup,
  type TalkSummary,
} from "@/lib/talk";

type Fail = { ok: false; error: string };

const MISTAKE_SCHEMA = {
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

const REPLY_SCHEMA = {
  name: "talk_reply",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "correction", "suggestions"],
    properties: {
      reply: { type: "string" },
      suggestions: { type: "array", items: { type: "string" } },
      correction: {
        type: "object",
        additionalProperties: false,
        required: ["ok", "better", "mistakes"],
        properties: {
          ok: { type: "boolean" },
          better: { type: "string" },
          mistakes: { type: "array", items: MISTAKE_SCHEMA },
        },
      },
    },
  },
};

const OPENING_SCHEMA = {
  name: "talk_opening",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["reply", "suggestions"],
    properties: { reply: { type: "string" }, suggestions: { type: "array", items: { type: "string" } } },
  },
};

/** Up to 3 short reply ideas (empty strings and very long ones dropped). */
function cleanSuggestions(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 120)
    .slice(0, 3);
}

/** The chat so far, as messages for the AI (last 20 only, to keep it fast and cheap). */
function history(messages: TalkMessage[]): AiMessage[] {
  return messages.slice(-20).map((m) => ({ role: m.role, content: m.text }));
}

async function loadConversation(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, kind, topic, title, messages, ended")
    .eq("id", id)
    .maybeSingle();
  return data ? { supabase, conv: data as { id: string; kind: "topic" | "roleplay"; topic: string; title: string; messages: TalkMessage[]; ended: boolean } } : null;
}

/** Starts a chat: Alex says hello. Returns the new conversation id. */
export async function startTalk(setup: TalkSetup): Promise<{ ok: true; id: string } | Fail> {
  const about = describeSetup(setup);
  if (!about || (setup.kind !== "topic" && setup.kind !== "roleplay")) return { ok: false, error: "Please choose a topic." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "Please log in again." };
  const profile = await getProfile();

  const opening = await aiAction(() =>
    chat<{ reply: string; suggestions: string[] }>({
      feature: "talk.start",
      task: `${talkPartner(about.about, profile.level, about.roleplay)}\n\n${TALK_OPENING}`,
      input: "Start the conversation now.",
      schema: OPENING_SCHEMA,
      maxTokens: 600,
    }),
  );
  if (!opening.ok) return opening;

  const first: TalkMessage = {
    role: "assistant",
    text: opening.data.reply.trim(),
    suggestions: cleanSuggestions(opening.data.suggestions),
    at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("conversations")
    .insert({ kind: setup.kind, topic: setup.topic.slice(0, 120), title: about.title.slice(0, 120), messages: [first] })
    .select("id")
    .single();
  if (error) {
    console.error("startTalk failed:", error.message);
    return { ok: false, error: "Could not start the chat. Please try again." };
  }
  return { ok: true, id: data.id };
}

/** I send a message: Alex replies, and my message gets a "better way to say" correction. */
export async function sendTalkMessage(
  conversationId: string,
  text: string,
  voice = false,
): Promise<{ ok: true; user: TalkMessage; reply: TalkMessage; replyIndex: number } | Fail> {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return { ok: false, error: "Please type or say something." };
  if (t.length > 1000) return { ok: false, error: "That message is very long. Please send a shorter one." };

  const loaded = await loadConversation(conversationId);
  if (!loaded) return { ok: false, error: "This chat was not found." };
  const { supabase, conv } = loaded;
  if (conv.ended) return { ok: false, error: "This chat has ended. Please start a new one." };
  if (conv.messages.length >= MAX_TALK_MESSAGES) {
    return { ok: false, error: "This chat is very long now. Please end it and start a new one." };
  }

  const about = describeSetup({ kind: conv.kind, topic: conv.topic });
  const profile = await getProfile();
  const answer = await aiAction(() =>
    chat<{ reply: string; correction: TalkCorrection; suggestions: string[] }>({
      feature: "talk.message",
      task: talkPartner(about?.about ?? `Talk about: ${conv.title}.`, profile.level, about?.roleplay ?? false),
      hindi: profile.hindiHelp,
      input: [
        ...history(conv.messages),
        { role: "user", content: voice ? `${t}\n\n(This message was spoken, not typed.)` : t },
      ],
      schema: REPLY_SCHEMA,
      maxTokens: 1500,
    }),
  );
  if (!answer.ok) return answer;

  const now = new Date().toISOString();
  const c = answer.data.correction;
  const correction: TalkCorrection = { ok: c.ok || c.mistakes.length === 0, better: c.ok ? "" : c.better.trim(), mistakes: c.ok ? [] : c.mistakes };
  const user: TalkMessage = { role: "user", text: t, correction, voice, at: now };
  const reply: TalkMessage = { role: "assistant", text: answer.data.reply.trim(), suggestions: cleanSuggestions(answer.data.suggestions), at: now };

  const { error } = await supabase
    .from("conversations")
    .update({ messages: [...conv.messages, user, reply] })
    .eq("id", conv.id);
  if (error) {
    console.error("sendTalkMessage save failed:", error.message);
    return { ok: false, error: "Could not save the message. Please try again." };
  }
  // Mistakes go to my notebook straight away (so nothing is lost if I never press "End").
  if (correction.mistakes.length) await saveMistakes(supabase, correction.mistakes, "talk");
  // replyIndex = position of Alex's reply in the saved chat (used to read it aloud).
  return { ok: true, user, reply, replyIndex: conv.messages.length + 1 };
}

const SUMMARY_SCHEMA = {
  name: "talk_summary",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "top_mistakes", "phrases", "encouragement"],
    properties: {
      summary: { type: "string" },
      top_mistakes: { type: "array", items: MISTAKE_SCHEMA },
      phrases: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["phrase", "meaning"],
          properties: { phrase: { type: "string" }, meaning: { type: "string" } },
        },
      },
      encouragement: { type: "string" },
    },
  },
};

/** Ends the chat: summary, top 3 mistakes, 5 useful phrases (phrases saved to my list). */
export async function endTalk(conversationId: string): Promise<{ ok: true; summary: TalkSummary } | Fail> {
  const loaded = await loadConversation(conversationId);
  if (!loaded) return { ok: false, error: "This chat was not found." };
  const { supabase, conv } = loaded;
  if (!conv.messages.some((m) => m.role === "user")) {
    await supabase.from("conversations").delete().eq("id", conv.id); // nothing said: no need to keep it
    return { ok: false, error: "You did not say anything yet, so there is nothing to sum up." };
  }

  const transcript = conv.messages
    .map((m) =>
      m.role === "assistant"
        ? `Alex: ${m.text}`
        : `Learner: ${m.text}${m.correction && !m.correction.ok ? `\n  (correction: ${m.correction.better})` : ""}`,
    )
    .join("\n")
    .slice(-12000);

  const answer = await aiAction(() =>
    chat<TalkSummary>({
      feature: "talk.summary",
      task: TALK_SUMMARY,
      input: `Chat about: ${conv.title}\n\n${transcript}`,
      schema: SUMMARY_SCHEMA,
      maxTokens: 2000,
    }),
  );
  if (!answer.ok) return answer;
  const summary: TalkSummary = {
    ...answer.data,
    top_mistakes: answer.data.top_mistakes.slice(0, 3),
    phrases: answer.data.phrases.slice(0, 5),
  };

  await supabase.from("conversations").update({ summary, ended: true }).eq("id", conv.id);
  // Phrases → my phrase list (duplicates are skipped by the unique index).
  for (const p of summary.phrases) {
    await supabase.from("saved_phrases").insert({ situation: conv.title, phrase: p.phrase.slice(0, 300), usage_note: p.meaning.slice(0, 300) });
  }
  return { ok: true, summary };
}
