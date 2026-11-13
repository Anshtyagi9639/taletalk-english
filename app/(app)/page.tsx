import { BookOpen, ChevronRight, Dumbbell, Flame, GraduationCap, Headphones, Mic, MessageCircle, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BookCover } from "@/components/library/book-cover";
import { MistakeReview, StoryOfTheDay, WordFlipCard } from "@/components/today/today-client";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ReadingArt, ShelfArt } from "@/components/ui/illustrations";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/profile";
import { getContinueReading, getResumeChapterNumber } from "@/lib/reader/queries";
import {
  getDailyPlan,
  getMistakesToReview,
  getMoodPicks,
  getStreakAndMinutes,
  getToday,
  getWordOfDay,
  splitGoal,
  talkTopicFor,
} from "@/lib/today/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Today" };

/** Home page after login: today's plan. */
export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayContent />
    </Suspense>
  );
}

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Everything here is about MY day (login cookie + time zone), so it streams in. */
async function TodayContent() {
  const [{ date, hour, label }, profile] = await Promise.all([getToday(), getProfile()]);
  const [stats, plan, continueList, word, mistakes] = await Promise.all([
    getStreakAndMinutes(date),
    getDailyPlan(date, profile),
    getContinueReading(1),
    getWordOfDay(date, profile.level),
    getMistakesToReview(date),
  ]);
  const [storyChapter, moods] = await Promise.all([
    plan.story ? getResumeChapterNumber(plan.story.id) : Promise.resolve(1),
    getMoodPicks(profile, plan.story?.id ?? null),
  ]);
  const goal = splitGoal(profile.dailyGoalMinutes);
  const continueItem = continueList.find((c) => c.bookId !== plan.story?.id);
  const topic = talkTopicFor(date);
  const goalDone = stats.readingToday >= goal.reading && stats.talkingToday >= goal.talking;

  return (
    <div className="space-y-6">
      {/* Greeting + streak + level + goal rings */}
      <section className="relative overflow-hidden rounded-sheet bg-hero p-6 shadow-lift sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-white/10" />
        <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-white/5" />
        {/* Illustration: a book under the night sky (big screens beside the text, phones in the corner). */}
        <ReadingArt className="pointer-events-none absolute -top-3 -right-8 w-36 opacity-60 sm:hidden" />
        <ReadingArt className="pointer-events-none absolute right-[13.5rem] bottom-2 hidden w-56 lg:block xl:right-60 xl:w-64" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/80">{label}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{greeting(hour)}! 👋</h1>
            <p className="text-base text-white/90">
              {goalDone ? "You reached today’s goal. Amazing! 🎉" : "A little English every day makes a big difference."}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                <Flame className={cn("size-4", stats.streak > 0 && "fill-warm text-warm")} aria-hidden />
                {stats.streak} day{stats.streak === 1 ? "" : "s"} streak
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#3730a3]">Level {profile.level}</span>
            </div>
            <WeekDots week={stats.week} />
          </div>
          <div className="flex gap-5">
            <GoalRing label="Reading" done={stats.readingToday} goal={goal.reading} />
            <GoalRing label="Talking" done={stats.talkingToday} goal={goal.talking} />
          </div>
        </div>
      </section>

      {/* Shown only until the level test is done. */}
      {!profile.placementDone && (
        <Link
          href="/placement"
          className="flex items-center gap-4 rounded-card border border-primary/25 bg-primary-soft p-4 transition hover:border-primary/50"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-bold">Find your level (5 min)</span>
            <span className="block text-muted-foreground">A short test, so we pick the right stories for you.</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
      )}

      {/* Continue: the book I am in the middle of — first, with one big button. */}
      {continueItem && (
        <section className="flex gap-4 rounded-card bg-card p-4 shadow-soft ring-1 ring-border sm:gap-6 sm:p-5" aria-label="Continue">
          <Link href={`/library/${continueItem.bookId}`} className="w-24 shrink-0 self-start sm:w-28" aria-label={`About ${continueItem.title}`}>
            <BookCover title={continueItem.title} coverUrl={continueItem.coverUrl} sizes="112px" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">Continue</p>
              <p className="line-clamp-2 text-lg leading-snug font-bold">{continueItem.title}</p>
              <p className="text-sm text-muted-foreground">Chapter {continueItem.chapterNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, continueItem.percent)}%` }} />
              </div>
              <span className="text-sm font-semibold text-muted-foreground tabular-nums">{Math.round(continueItem.percent)}% done</span>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              <Link
                href={`/reader/${continueItem.bookId}/${continueItem.chapterNumber}?listen=1`}
                className={cn(buttonVariants({ size: "lg" }), "flex-1 sm:flex-none")}
              >
                <Headphones /> Continue listening
              </Link>
              <Link href={`/reader/${continueItem.bookId}/${continueItem.chapterNumber}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
                <BookOpen /> Read
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-3 lg:items-start">
        {/* Today's story + mood picker */}
        <Panel className="lg:col-span-2" icon={<BookOpen />} title="Today's story" tone="primary">
          {plan.story ? (
            <StoryOfTheDay
              date={date}
              plan={plan.story}
              reason={plan.reason}
              completed={plan.completed}
              storyChapter={storyChapter}
              relax={moods.relax}
              challenge={moods.challenge}
              backup={plan.backup}
            />
          ) : (
            <EmptyState
              icon={BookOpen}
              art={<ShelfArt className="w-40" />}
              title="No story yet"
              text="Your library is empty. Let’s add your first story!"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/library/create" className={buttonVariants({ size: "lg" })}>
                    <Sparkles /> Create a story for me
                  </Link>
                  <Link href="/library" className={buttonVariants({ variant: "outline", size: "lg" })}>
                    Add starter books
                  </Link>
                </div>
              }
            />
          )}
        </Panel>

        {/* Word of the day (flip card) */}
        <Panel className="lg:col-start-3 lg:row-start-1" icon={<Sparkles />} title={word.mine ? "Your word to review" : "Word of the day"} tone="warm">
          <WordFlipCard word={word.word} meaning={word.meaning} example={word.example} />
          {word.mine && (
            <Link href="/progress/words" className="inline-block text-sm font-semibold text-primary hover:underline">
              Review all my words →
            </Link>
          )}
        </Panel>

        {/* Mistakes: 5-card quiz */}
        <Panel className="lg:col-span-2 lg:row-start-2" icon={<RotateCcw />} title="Fix yesterday's mistakes" tone="warm">
          {mistakes.length > 0 ? (
            <MistakeReview mistakes={mistakes} />
          ) : (
            <p className="text-base text-muted-foreground">
              No mistakes saved yet. Talk with Alex or check a chapter — your notebook fills itself.
            </p>
          )}
        </Panel>

        {/* Talk topic */}
        <Panel className="lg:col-start-3 lg:row-start-2" icon={<MessageCircle />} title="Today's talk topic" tone="success">
          <p className="text-lg leading-snug font-semibold">“{topic}”</p>
          <Link href={`/talk?topic=${encodeURIComponent(topic)}`} className={cn(buttonVariants({ variant: "soft", size: "lg" }), "w-full")}>
            <Mic /> Start talking
          </Link>
        </Panel>

        {/* Quick practice */}
        <Panel className="lg:col-start-3 lg:row-start-3" icon={<Dumbbell />} title="Quick practice" tone="muted">
          <ul className="-mx-2 space-y-0.5">
            <QuickLink href="/library/create" icon={<Sparkles />} text="Create a new story" />
            <QuickLink href="/speak" icon={<Mic />} text="Pronunciation practice" />
            <QuickLink href="/practice/grammar" icon={<Dumbbell />} text="Check my grammar" />
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/** Small streak calendar: one dot per day for the last 7 days (today last). */
function WeekDots({ week }: { week: { date: string; active: boolean }[] }) {
  const letters = ["S", "M", "T", "W", "T", "F", "S"];
  return (
    <ol className="flex gap-2 pt-3" aria-label="Last 7 days">
      {week.map((d, i) => {
        const letter = letters[new Date(`${d.date}T12:00:00Z`).getUTCDay()];
        const today = i === week.length - 1;
        return (
          <li key={d.date} aria-label={`${d.date}: ${d.active ? "practised" : "no practice"}`}>
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-[11px] font-bold",
                d.active ? "bg-warm text-warm-foreground" : "bg-white/15 text-white/80",
                today && "ring-2 ring-white/70",
              )}
            >
              {d.active ? <Flame className="size-3.5 fill-current" aria-hidden /> : letter}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const TONES = {
  primary: "bg-primary-soft text-primary",
  warm: "bg-warm-soft text-warm-text",
  success: "bg-success-soft text-success",
  muted: "bg-muted text-muted-foreground",
};

function Panel({
  icon,
  title,
  tone,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  tone: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("space-y-4 rounded-card bg-card p-5 text-card-foreground shadow-soft ring-1 ring-border", className)}>
      <h2 className="flex items-center gap-2.5 text-base font-bold">
        <span className={cn("flex size-8 items-center justify-center rounded-lg [&>svg]:size-4.5", TONES[tone])} aria-hidden>
          {icon}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function QuickLink({ href, icon, text }: { href: string; icon: ReactNode; text: string }) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-base transition hover:bg-muted">
        <span className="text-primary [&>svg]:size-5" aria-hidden>
          {icon}
        </span>
        <span className="flex-1">{text}</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

/** A ring that fills up as I reach today's minutes goal (white, on the hero card). */
function GoalRing({ label, done, goal }: { label: string; done: number; goal: number }) {
  const pct = goal > 0 ? Math.min(1, done / goal) : 1;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative size-20">
        <svg viewBox="0 0 72 72" className="size-20 -rotate-90" role="img" aria-label={`${label}: ${done} of ${goal} minutes`}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="7" />
          <circle
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={pct >= 1 ? "var(--warm)" : "currentColor"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            className="transition-[stroke-dashoffset] duration-700 ease-(--ease-out-soft)"
          />
        </svg>
        <span className="absolute inset-0 flex flex-col items-center justify-center text-sm leading-tight font-bold tabular-nums">
          {pct >= 1 ? "✓" : `${done}`}
          <span className="text-[10px] font-medium text-white/80">/ {goal} min</span>
        </span>
      </div>
      <span className="text-xs font-semibold text-white/90">{label}</span>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your day">
      <Skeleton className="h-48 rounded-sheet" />
      <div className="grid gap-5 lg:grid-cols-3">
        <CardSkeleton lines={5} className="lg:col-span-2" />
        <CardSkeleton lines={4} />
      </div>
    </div>
  );
}
