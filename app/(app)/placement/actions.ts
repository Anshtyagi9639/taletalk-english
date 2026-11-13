"use server";

import { LEVELS, type Level } from "@/lib/books/types";
import { PLACEMENT_QUESTIONS } from "@/lib/placement/questions";
import { scorePlacement } from "@/lib/placement/score";
import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/topics";

type Saved = { ok: true; level: Level; right: number; total: number } | { ok: false; error: string };

async function saveProfile(patch: Record<string, unknown>) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return "Please log in again.";
  const { error } = await supabase.from("profiles").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) {
    console.error("placement save failed:", error.message);
    return "Could not save. Please try again.";
  }
  return null;
}

function cleanInterests(ids: string[]) {
  return ids.filter((id) => INTERESTS.some((i) => i.id === id)).slice(0, 12);
}

/** Checks my quiz answers on the server and saves my level + interests. */
export async function submitPlacement(answers: (number | null)[], interests: string[]): Promise<Saved> {
  if (!Array.isArray(answers) || answers.length !== PLACEMENT_QUESTIONS.length) {
    return { ok: false, error: "Please answer the questions first." };
  }
  const result = scorePlacement(answers.map((a) => (Number.isInteger(a) ? a : null)));
  const error = await saveProfile({ level: result.level, interests: cleanInterests(interests), placement_done: true });
  if (error) return { ok: false, error };
  return { ok: true, level: result.level, right: result.right, total: result.total };
}

/** "I know my level": skip the test. */
export async function chooseLevel(level: Level, interests: string[]): Promise<Saved> {
  if (!LEVELS.includes(level)) return { ok: false, error: "Please choose a level." };
  const error = await saveProfile({ level, interests: cleanInterests(interests), placement_done: true });
  if (error) return { ok: false, error };
  return { ok: true, level, right: 0, total: 0 };
}
