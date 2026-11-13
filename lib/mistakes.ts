import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MISTAKE_TYPES = [
  "tense", "article", "preposition", "word choice", "spelling", "punctuation", "word order", "other",
] as const;
export type MistakeType = (typeof MISTAKE_TYPES)[number];

export type NewMistake = { wrong: string; right: string; reason: string; type: string };

/** Saves mistakes to my notebook (skips empty ones and "wrong = right"). Never throws. */
export async function saveMistakes(supabase: SupabaseClient, list: NewMistake[], sourceFeature: string) {
  const rows = list
    .filter((m) => m.wrong?.trim() && m.right?.trim() && m.wrong.trim() !== m.right.trim())
    .slice(0, 20)
    .map((m) => ({
      wrong: m.wrong.trim().slice(0, 500),
      right: m.right.trim().slice(0, 500),
      reason: m.reason?.trim().slice(0, 300) || null,
      type: (MISTAKE_TYPES as readonly string[]).includes(m.type) ? m.type : "other",
      source_feature: sourceFeature,
    }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from("mistakes").insert(rows);
  if (error) {
    console.error("saveMistakes failed:", error.message);
    return 0;
  }
  return rows.length;
}
