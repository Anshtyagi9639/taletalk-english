import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { readingMinutes } from "@/lib/books/levels";
import type { Level, ReadingStatus } from "@/lib/books/types";
import { addDays, dayNumber, todayIn, TZ_COOKIE, validTimeZone } from "@/lib/dates";
import type { Profile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { genresForInterests, INTERESTS, TALK_TOPICS } from "@/lib/topics";
import { DAY_WORDS } from "./words";

/** My "today" (in my time zone, from the tz cookie). */
export async function getToday() {
  await connection(); // we read the clock: only at request time
  const tz = validTimeZone((await cookies()).get(TZ_COOKIE)?.value);
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  const label = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(now);
  return { tz, date: todayIn(tz, now), hour, label };
}

// ---------------------------------------------------------------------------
// Streak + today's minutes
// ---------------------------------------------------------------------------

export async function getStreakAndMinutes(date: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_log")
    .select("feature, date, minutes")
    .gte("date", addDays(date, -400))
    .lte("date", date);
  const rows = data ?? [];
  const activeDays = new Set(rows.filter((r) => r.minutes > 0).map((r) => r.date as string));

  // Count back from today (or from yesterday, if I have not practised yet today).
  let day = activeDays.has(date) ? date : addDays(date, -1);
  let streak = 0;
  while (activeDays.has(day)) {
    streak++;
    day = addDays(day, -1);
  }

  const today = rows.filter((r) => r.date === date);
  const minutes = (feature: string) => today.filter((r) => r.feature === feature).reduce((s, r) => s + r.minutes, 0);
  // The last 7 days, oldest first (for the small streak calendar).
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(date, i - 6);
    return { date: d, active: activeDays.has(d) };
  });
  return { streak, week, readingToday: minutes("reading"), talkingToday: minutes("talk") };
}

/** Daily goal split: ~60% reading, ~40% talking (25 min → 15 + 10). */
export function splitGoal(total: number) {
  const reading = Math.round(total * 0.6);
  return { reading, talking: Math.max(0, total - reading) };
}

// ---------------------------------------------------------------------------
// Today's story (daily_plan)
// ---------------------------------------------------------------------------

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type Candidate = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  level: Level | null;
  genre: string | null;
  source: string;
  word_count: number;
  chapter_count: number;
  reading_progress: { status: ReadingStatus }[] | null;
};

export type PlanBook = Pick<Candidate, "id" | "title" | "author" | "cover_url" | "level" | "word_count">;
export type DailyPlan = { story: PlanBook | null; backup: PlanBook | null; reason: string | null; completed: boolean };

/** Small stable random number per date + book (so ties are broken the same way all day). */
function jitter(date: string, id: string) {
  let h = dayNumber(date);
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return (Math.abs(h) % 1000) / 10000;
}

function score(b: Candidate, profile: Profile, liked: Set<string>, recent: Set<string>, date: string) {
  const status = b.reading_progress?.[0]?.status ?? "want";
  const reasons: { weight: number; text: string }[] = [];
  let s = 0;

  const mine = LEVEL_ORDER.indexOf(profile.level);
  const diff = b.level ? LEVEL_ORDER.indexOf(b.level) - mine : 1;
  if (diff === 0) {
    s += 3;
    reasons.push({ weight: 3, text: `It is at your level (${profile.level}).` });
  } else if (diff === 1) {
    s += 2;
    reasons.push({ weight: 2, text: `A small step up from your level (${profile.level} → ${b.level}).` });
  } else if (diff === -1) {
    s += 1.5;
    reasons.push({ weight: 1, text: "Easy reading for a relaxed day." });
  } else s -= Math.abs(diff);

  if (b.genre && liked.has(b.genre)) {
    s += 2;
    const interest = INTERESTS.find((i) => i.genres.includes(b.genre!) && profile.interests.includes(i.id));
    reasons.push({ weight: 2.5, text: `You like ${(interest?.label ?? b.genre).toLowerCase()}.` });
  }
  const minutes = readingMinutes(b.word_count);
  if (minutes <= 60) {
    s += 1;
    reasons.push({ weight: 1.5, text: `A short read: about ${minutes} min.` });
  }
  if (b.source === "ai" && status === "want") {
    s += 1;
    reasons.push({ weight: 2, text: "Written just for you." });
  }
  if (status === "reading") s += 0.5;
  if (recent.has(b.id)) s -= 3;

  const reason = reasons
    .sort((a, b2) => b2.weight - a.weight)
    .slice(0, 2)
    .map((r) => r.text)
    .join(" ");
  return { s: s + jitter(date, b.id), reason: reason || "A good story to practise your reading." };
}

/** Today's plan: made once per day, then read from the database. */
export async function getDailyPlan(date: string, profile: Profile): Promise<DailyPlan> {
  const supabase = await createClient();
  const select = "story:books!daily_plan_story_book_id_fkey(id, title, author, cover_url, level, word_count), backup:books!daily_plan_backup_book_id_fkey(id, title, author, cover_url, level, word_count), reason, completed";

  const { data: existing } = await supabase.from("daily_plan").select(select).eq("date", date).maybeSingle();
  if (existing) return existing as unknown as DailyPlan;

  // Make today's plan.
  const [{ data: books }, { data: recentPlans }] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, cover_url, level, genre, source, word_count, chapter_count, reading_progress(status)")
      .neq("source", "info_only")
      .gt("chapter_count", 0),
    supabase.from("daily_plan").select("story_book_id").gte("date", addDays(date, -7)).lt("date", date),
  ]);
  const recent = new Set((recentPlans ?? []).map((p) => p.story_book_id as string));
  const liked = genresForInterests(profile.interests);
  const ranked = ((books ?? []) as unknown as Candidate[])
    .filter((b) => (b.reading_progress?.[0]?.status ?? "want") !== "finished")
    .map((b) => ({ b, ...score(b, profile, liked, recent, date) }))
    .sort((x, y) => y.s - x.s);

  const story = ranked[0];
  const backup = ranked[1];
  await supabase.from("daily_plan").upsert(
    { date, story_book_id: story?.b.id ?? null, backup_book_id: backup?.b.id ?? null, reason: story?.reason ?? null },
    { onConflict: "user_id,date", ignoreDuplicates: true },
  );
  const pick = (c?: { b: Candidate }) =>
    c ? { id: c.b.id, title: c.b.title, author: c.b.author, cover_url: c.b.cover_url, level: c.b.level, word_count: c.b.word_count } : null;
  return { story: pick(story), backup: pick(backup), reason: story?.reason ?? null, completed: false };
}

export type MoodPicks = { relax: PlanBook | null; challenge: PlanBook | null };

/**
 * Mood picker on Today: "Relax" = an easy, short story; "Challenge" = a step above my level.
 * ("Learn" is today's planned story.) Only unfinished books from my library.
 */
export async function getMoodPicks(profile: Profile, exclude: string | null): Promise<MoodPicks> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select("id, title, author, cover_url, level, genre, source, word_count, chapter_count, reading_progress(status)")
    .neq("source", "info_only")
    .gt("chapter_count", 0)
    .limit(300);
  const mine = LEVEL_ORDER.indexOf(profile.level);
  const books = ((data ?? []) as unknown as Candidate[]).filter(
    (b) => b.id !== exclude && (b.reading_progress?.[0]?.status ?? "want") !== "finished",
  );
  const diff = (b: Candidate) => (b.level ? LEVEL_ORDER.indexOf(b.level) - mine : 0);
  const relax = books.filter((b) => diff(b) <= 0).sort((a, b) => diff(a) - diff(b) || a.word_count - b.word_count)[0];
  const challenge = books.filter((b) => diff(b) >= 1).sort((a, b) => diff(a) - diff(b) || a.word_count - b.word_count)[0];
  const pick = (b?: Candidate) =>
    b ? { id: b.id, title: b.title, author: b.author, cover_url: b.cover_url, level: b.level, word_count: b.word_count } : null;
  return { relax: pick(relax), challenge: pick(challenge) };
}

// ---------------------------------------------------------------------------
// Word of the day, talk topic, mistakes
// ---------------------------------------------------------------------------

export type WordOfDay = { word: string; meaning: string; example: string | null; mine: boolean };

/** One of MY saved words that is due for review, or a useful word for my level. */
export async function getWordOfDay(date: string, level: Level): Promise<WordOfDay> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_words")
    .select("word, meaning, example")
    .lte("next_review_date", date)
    .order("next_review_date")
    .limit(1)
    .maybeSingle();
  if (data) return { word: data.word, meaning: data.meaning, example: data.example, mine: true };

  const forLevel = DAY_WORDS.filter((w) => w.level === (level === "A1" ? "A2" : level === "C2" ? "C1" : level));
  const w = forLevel[dayNumber(date) % forLevel.length];
  return { word: w.word, meaning: w.meaning, example: w.example, mine: false };
}

export function talkTopicFor(date: string) {
  return TALK_TOPICS[dayNumber(date) % TALK_TOPICS.length];
}

export type ReviewMistake = { id: string; wrong: string; right: string; reason: string | null; type: string };

/** Up to 5 mistakes to practise: yesterday's first, then the ones I got wrong most recently. */
export async function getMistakesToReview(date: string): Promise<ReviewMistake[]> {
  const supabase = await createClient();
  const fields = "id, wrong, right, reason, type";
  const { data: yesterday } = await supabase
    .from("mistakes")
    .select(fields)
    .gte("created_at", `${addDays(date, -1)}T00:00:00Z`)
    .lt("created_at", `${date}T00:00:00Z`)
    .order("created_at", { ascending: false })
    .limit(5);
  const list = (yesterday ?? []) as ReviewMistake[];
  if (list.length >= 5) return list;

  const { data: more } = await supabase
    .from("mistakes")
    .select(fields)
    .order("correct_count")
    .order("created_at", { ascending: false })
    .limit(10);
  for (const m of (more ?? []) as ReviewMistake[]) {
    if (list.length >= 5) break;
    if (!list.some((x) => x.id === m.id)) list.push(m);
  }
  return list;
}
