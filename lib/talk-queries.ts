import "server-only";
import { isUuid } from "@/lib/books/queries";
import { createClient } from "@/lib/supabase/server";
import type { TalkMessage, TalkSummary } from "@/lib/talk";

export type Conversation = {
  id: string;
  kind: "topic" | "roleplay";
  topic: string;
  title: string;
  messages: TalkMessage[];
  summary: TalkSummary | null;
  ended: boolean;
  updated_at: string;
};

export async function getConversation(id: string): Promise<Conversation | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, kind, topic, title, messages, summary, ended, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (data as Conversation | null) ?? null;
}

export type ConversationListItem = {
  id: string;
  title: string;
  ended: boolean;
  updated_at: string;
  messageCount: number;
  summary: string | null;
};

/** My recent chats (newest first). */
export async function getRecentConversations(limit = 8): Promise<ConversationListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, title, ended, updated_at, messages, summary")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    ended: c.ended,
    updated_at: c.updated_at,
    messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
    summary: (c.summary as TalkSummary | null)?.summary ?? null,
  }));
}
