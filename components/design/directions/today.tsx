import { ChevronRight, Headphones, MessageCircle, Play, Snowflake, Sparkles, Timer, Volume2 } from "lucide-react";
import { BookCover } from "@/components/library/book-cover";
import { AlexFace, ReadingArt } from "@/components/ui/illustrations";
import { LevelBadge } from "@/components/ui/level-badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";
import { GOAL, OZ, STORY, STREAK, TALK_TOPIC, WORD } from "./mock";

/* ───────────────────────── A · Calm focus ───────────────────────── */

/** Today, direction A: typographic greeting, one big Continue card, two quiet medium cards, the rest in a list. */
export function TodayCalm() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Friday, 13 November</p>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-balance sm:text-4xl">
          Good afternoon. <span className="text-muted-foreground">You&apos;re 4 minutes from the end of chapter 2.</span>
        </h1>
        <WeekLine />
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Big: Continue */}
        <section aria-label="Continue reading" className="rounded-sheet bg-card p-5 shadow-soft sm:p-6 lg:col-span-2 lg:row-span-2">
          <div className="flex gap-5">
            <BookCover title={OZ.title} author={OZ.author} coverUrl={OZ.cover} className="w-28 shrink-0 sm:w-36" />
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-sm font-semibold text-primary">Continue</p>
              <h2 className="mt-1 text-xl leading-snug font-bold sm:text-2xl">{OZ.title}</h2>
              <p className="mt-1 text-base text-muted-foreground">
                Chapter {OZ.chapter} · {OZ.minutesLeft} min left
              </p>
              <div className="mt-auto pt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={OZ.percent} aria-label="Book progress">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${OZ.percent}%` }} />
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{OZ.percent}% of the book</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-soft">
              Continue reading
            </button>
            <button type="button" aria-label="Listen instead" className="flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground">
              <Headphones className="size-5" />
            </button>
          </div>
        </section>

        {/* Medium: Today's story */}
        <section aria-label="Today's story" className="flex gap-4 rounded-card bg-card p-4 shadow-soft">
          <BookCover title={STORY.title} author={STORY.author} coverUrl={null} className="w-16 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted-foreground">Today&apos;s story</p>
            <p className="text-base leading-snug font-bold">{STORY.title}</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <LevelBadge level={STORY.level} /> {STORY.minutes} min
            </p>
            <button type="button" className="mt-2 text-sm font-semibold text-primary">Start story →</button>
          </div>
        </section>

        {/* Medium: Quick 5-minute session */}
        <section aria-label="Quick 5-minute session" className="rounded-card bg-card p-4 shadow-soft">
          <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Timer className="size-4" aria-hidden /> Quick 5 minutes
          </p>
          <p className="mt-1 text-base leading-snug font-bold">1 word · 2 mistakes · 1 phrase</p>
          <p className="text-sm text-muted-foreground">A short mix from your notebook.</p>
          <button type="button" className="mt-2 text-sm font-semibold text-primary">Start session →</button>
        </section>
      </div>

      {/* More for today: quiet rows, no borders */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">More for today</h2>
        <ul className="divide-y divide-border/60 overflow-hidden rounded-card bg-card shadow-soft">
          <QuietRow icon={<Volume2 className="size-5" />} title={`Word: ${WORD.word}`} text={WORD.meaning} />
          <QuietRow icon={<MessageCircle className="size-5" />} title="Talk topic" text={TALK_TOPIC} />
          <QuietRow icon={<Sparkles className="size-5" />} title="Fix 5 mistakes" text="From your talks this week" />
        </ul>
      </section>
    </div>
  );
}

/** One line: 7 small dots for the week + a kind streak note with a rest day (snowflake). */
function WeekLine() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-muted-foreground">
      <ol className="flex gap-1.5" aria-label="This week">
        {STREAK.week.map((d, i) => (
          <li
            key={i}
            aria-label={`${days[i]}: ${d === "rest" ? "rest day" : d ? "practised" : "not yet"}`}
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
              d === true && "bg-primary text-primary-foreground",
              d === "rest" && "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
              d === false && "bg-muted",
              i === STREAK.todayIndex && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            {d === "rest" ? <Snowflake className="size-3.5" /> : days[i]}
          </li>
        ))}
      </ol>
      <span>
        <strong className="text-foreground">{STREAK.days}-day streak</strong> · 1 rest day left this week
      </span>
    </div>
  );
}

function QuietRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li>
      <button type="button" className="flex min-h-16 w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/50">
        <span className="text-muted-foreground" aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">{title}</span>
          <span className="block truncate text-sm text-muted-foreground">{text}</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </button>
    </li>
  );
}

/* ───────────────────────── B · Warm & playful ───────────────────────── */

/** Today, direction B: cover-tinted Continue hero, bento tiles with color and drawings. */
export function TodayWarm() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex items-center gap-3">
        <span className="size-12 shrink-0 overflow-hidden rounded-full ring-2 ring-card shadow-soft">
          <AlexFace className="size-full" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Good afternoon! 👋</p>
          <h1 className="text-xl leading-snug font-bold text-balance">4 minutes to finish chapter 2 — you can do it!</h1>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-[auto_auto]">
        {/* Big: Continue, colored from the cover */}
        <section
          aria-label="Continue reading"
          className="relative col-span-2 overflow-hidden rounded-sheet p-5 text-white shadow-lift lg:row-span-2"
          style={{ background: `linear-gradient(150deg, ${OZ.tint} 0%, color-mix(in oklab, ${OZ.tint} 55%, black) 100%)` }}
        >
          <div className="flex gap-4">
            <BookCover title={OZ.title} author={OZ.author} coverUrl={OZ.cover} className="w-24 shrink-0 -rotate-3 sm:w-32" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white/80">Chapter {OZ.chapter} · {OZ.minutesLeft} min left</p>
              <h2 className="mt-1 text-xl leading-snug font-bold sm:text-2xl">{OZ.title}</h2>
              <div className="mt-3 flex items-center gap-3">
                <ProgressRing value={(GOAL.reading / GOAL.readingGoal) * 100} size={52} stroke={6} tone="warm" label="Reading goal">
                  <span className="text-xs font-bold text-white">{GOAL.reading}m</span>
                </ProgressRing>
                <p className="text-sm text-white/85">{GOAL.reading} of {GOAL.readingGoal} min today</p>
              </div>
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button type="button" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-warm text-base font-bold text-warm-foreground shadow-soft">
              <Play className="size-5 fill-current" aria-hidden /> Continue reading
            </button>
            <button type="button" aria-label="Listen instead" className="flex size-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Headphones className="size-5" />
            </button>
          </div>
        </section>

        {/* Medium: today's story */}
        <section aria-label="Today's story" className="col-span-1 rounded-card bg-primary-soft p-4">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Today&apos;s story</p>
          <BookCover title={STORY.title} author={STORY.author} coverUrl={null} className="mt-2 w-14" />
          <p className="mt-2 text-base leading-snug font-bold">{STORY.title}</p>
          <p className="text-sm text-muted-foreground">{STORY.minutes} min · {STORY.level}</p>
        </section>

        {/* Medium: quick 5 minutes */}
        <section aria-label="Quick 5-minute session" className="col-span-1 flex flex-col rounded-card bg-warm-soft p-4">
          <p className="text-xs font-bold tracking-wide text-warm-text uppercase">Quick 5 min</p>
          <Timer className="mt-2 size-9 text-warm" aria-hidden />
          <p className="mt-2 text-base leading-snug font-bold">Word, mistakes, a phrase</p>
          <p className="mt-auto text-sm font-semibold text-warm-text">Start →</p>
        </section>

        {/* Small tiles */}
        <SmallTile tone="bg-card" label="Streak">
          <span className="flex items-center gap-1 text-lg font-bold">🔥 {STREAK.days} <Snowflake className="ml-1 size-4 text-sky-500" aria-label="1 rest day" /></span>
          <span className="text-sm text-muted-foreground">Rest day ready</span>
        </SmallTile>
        <SmallTile tone="bg-card" label="Word of the day">
          <span className="text-lg font-bold">{WORD.word}</span>
          <span className="text-sm text-muted-foreground">Tap to learn</span>
        </SmallTile>
      </div>

      <details className="group rounded-card bg-card shadow-soft">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-semibold">
          More for today
          <ChevronRight className="size-5 transition group-open:rotate-90" aria-hidden />
        </summary>
        <div className="flex items-center gap-3 px-4 pb-4">
          <ReadingArt className="w-16" />
          <p className="text-sm text-muted-foreground">Talk topic: “{TALK_TOPIC}” · Fix 5 mistakes</p>
        </div>
      </details>
    </div>
  );
}

function SmallTile({ tone, label, children }: { tone: string; label: string; children: React.ReactNode }) {
  return (
    <section aria-label={label} className={cn("flex flex-col gap-0.5 rounded-card p-4 shadow-soft", tone)}>
      <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
    </section>
  );
}
