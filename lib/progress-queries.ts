import "server-only";
import { addDays } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const FEATURE_LABELS: Record<string, string> = {
  reading: "Reading",
  talk: "Talking",
  practice: "Practice",
  speak: "Speaking",
  interview: "Interview",
};

export type DayMinutes = { date: string; byFeature: Record<string, number>; total: number };

/** Totals + the last 30 days, for the Progress page. */
export async function getProgressStats(today: string) {
  const supabase = await createClient();
  const [log, finished, words, mistakes, phrases, dueWords] = await Promise.all([
    supabase.from("practice_log").select("feature, date, minutes"),
    supabase.from("reading_progress").select("id", { count: "exact", head: true }).eq("status", "finished"),
    supabase.from("saved_words").select("id", { count: "exact", head: true }),
    supabase.from("mistakes").select("id", { count: "exact", head: true }),
    supabase.from("saved_phrases").select("id", { count: "exact", head: true }),
    supabase.from("saved_words").select("id", { count: "exact", head: true }).lte("next_review_date", today),
  ]);

  const rows = (log.data ?? []) as { feature: string; date: string; minutes: number }[];
  const totals: Record<string, number> = {};
  for (const r of rows) totals[r.feature] = (totals[r.feature] ?? 0) + r.minutes;

  const days: DayMinutes[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = addDays(today, -i);
    const byFeature: Record<string, number> = {};
    for (const r of rows) if (r.date === date) byFeature[r.feature] = (byFeature[r.feature] ?? 0) + r.minutes;
    days.push({ date, byFeature, total: Object.values(byFeature).reduce((s, n) => s + n, 0) });
  }

  // Heatmap: the last 18 weeks (126 days), minutes per day.
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.minutes);
  const heat = Array.from({ length: 126 }, (_, i) => {
    const date = addDays(today, i - 125);
    return { date, total: perDay.get(date) ?? 0 };
  });

  // Longest streak ever (for the "7-day streak" and "30-day streak" badges).
  const active = [...perDay.entries()].filter(([, m]) => m > 0).map(([d]) => d).sort();
  let bestStreak = 0;
  let run = 0;
  for (let i = 0; i < active.length; i++) {
    run = i > 0 && addDays(active[i - 1], 1) === active[i] ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  }

  return {
    heat,
    bestStreak,
    totals,
    totalMinutes: Object.values(totals).reduce((s, n) => s + n, 0),
    days,
    activeDays: new Set(rows.filter((r) => r.minutes > 0).map((r) => r.date)).size,
    booksFinished: finished.count ?? 0,
    wordsSaved: words.count ?? 0,
    wordsDue: dueWords.count ?? 0,
    mistakes: mistakes.count ?? 0,
    phrases: phrases.count ?? 0,
  };
}

export type SavedWord = {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  phonetic: string | null;
  hindi: string | null;
  next_review_date: string;
  interval_days: number;
  review_count: number;
};

const WORD_FIELDS = "id, word, meaning, example, phonetic, hindi, next_review_date, interval_days, review_count";

/** All my saved words (next review first). */
export async function getAllWords(): Promise<SavedWord[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("saved_words").select(WORD_FIELDS).order("next_review_date").limit(500);
  return (data ?? []) as SavedWord[];
}

export async function getDueWords(today: string): Promise<SavedWord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_words")
    .select(WORD_FIELDS)
    .lte("next_review_date", today)
    .order("next_review_date")
    .limit(30);
  return (data ?? []) as SavedWord[];
}

export type MistakeRow = {
  id: string;
  wrong: string;
  right: string;
  reason: string | null;
  type: string;
  source_feature: string;
  review_count: number;
  correct_count: number;
  created_at: string;
};

export async function getMistakes(): Promise<MistakeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mistakes")
    .select("id, wrong, right, reason, type, source_feature, review_count, correct_count, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as MistakeRow[];
}
