"use server";

import { isUuid } from "@/lib/books/queries";
import { addDays } from "@/lib/dates";
import { nextInterval } from "@/lib/srs";
import { createClient } from "@/lib/supabase/server";

/** A flashcard answer: schedule the next review. `localDate` = today on my device. */
export async function reviewWord(id: string, knew: boolean, localDate: string) {
  if (!isUuid(id) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return { ok: false as const };
  const supabase = await createClient();
  const { data } = await supabase.from("saved_words").select("interval_days, review_count").eq("id", id).maybeSingle();
  if (!data) return { ok: false as const };
  const interval = nextInterval(data.interval_days, knew);
  const { error } = await supabase
    .from("saved_words")
    .update({ interval_days: interval, next_review_date: addDays(localDate, interval), review_count: data.review_count + 1 })
    .eq("id", id);
  return { ok: !error, interval };
}

export async function deleteWord(id: string) {
  if (!isUuid(id)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("saved_words").delete().eq("id", id);
  return { ok: !error };
}

export async function deleteMistake(id: string) {
  if (!isUuid(id)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("mistakes").delete().eq("id", id);
  return { ok: !error };
}
