"use server";

import { isUuid } from "@/lib/books/queries";
import { createClient } from "@/lib/supabase/server";

/** "I read it": marks today's story as done. */
export async function markPlanDone(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("daily_plan").update({ completed: true }).eq("date", date);
  return { ok: !error };
}

/** Practising a mistake: count the try (and whether I chose the right sentence). */
export async function reviewMistake(id: string, correct: boolean) {
  if (!isUuid(id)) return { ok: false as const };
  const supabase = await createClient();
  const { data } = await supabase.from("mistakes").select("review_count, correct_count").eq("id", id).maybeSingle();
  if (!data) return { ok: false as const };
  const { error } = await supabase
    .from("mistakes")
    .update({
      review_count: data.review_count + 1,
      correct_count: data.correct_count + (correct ? 1 : 0),
      last_reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  return { ok: !error };
}
