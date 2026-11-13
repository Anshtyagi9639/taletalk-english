import { BookCheck, BookOpen, ChevronRight, Flame, Layers, MessageCircle, MessageSquareQuote, NotebookPen, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityHeatmap, BadgesGrid } from "@/components/progress/activity";
import { MinutesChart } from "@/components/progress/minutes-chart";
import { CardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { TrophyArt } from "@/components/ui/illustrations";
import { StatCard } from "@/components/ui/stat-card";
import { formatMinutes } from "@/lib/books/levels";
import { FEATURE_LABELS, getProgressStats } from "@/lib/progress-queries";
import { getStreakAndMinutes, getToday } from "@/lib/today/queries";

export const metadata = { title: "Progress" };

export default function ProgressPage() {
  return (
    <>
      <PageHeader icon={TrendingUp} tone="emerald" title="Progress" description="See how far you have come." art={<TrophyArt className="w-32" />} />
      <Suspense fallback={<ProgressSkeleton />}>
        <ProgressContent />
      </Suspense>
    </>
  );
}

async function ProgressContent() {
  const { date } = await getToday();
  const [stats, streak] = await Promise.all([getProgressStats(date), getStreakAndMinutes(date)]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={BookOpen} value={formatMinutes(stats.totals.reading ?? 0)} label="Minutes read" />
        <StatCard icon={MessageCircle} value={formatMinutes(stats.totals.talk ?? 0)} label="Minutes talked" tone="success" />
        <StatCard icon={BookCheck} value={stats.booksFinished} label="Books finished" tone="warm" />
        <StatCard icon={Layers} value={stats.wordsSaved} label="Words learned" tone="primary" />
      </div>

      <Section title="Your streak" aside={<span className="inline-flex items-center gap-1.5 rounded-full bg-warm-soft px-3 py-1 text-sm font-bold text-warm-text"><Flame className="size-4 fill-warm text-warm" aria-hidden /> {streak.streak} day{streak.streak === 1 ? "" : "s"} now · best {stats.bestStreak}</span>}>
        <ActivityHeatmap days={stats.heat} />
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Last 30 days">
          <MinutesChart days={stats.days} />
          <p className="text-sm text-muted-foreground">
            Active on {stats.activeDays} day{stats.activeDays === 1 ? "" : "s"} in total · {formatMinutes(stats.totalMinutes)} of practice.
          </p>
        </Section>
        <Section title="Time by activity">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(FEATURE_LABELS).map(([f, label]) => (
              <li key={f} className="rounded-xl bg-muted/60 p-3">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-lg font-bold tabular-nums">{formatMinutes(stats.totals[f] ?? 0)}</p>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Badges">
        <BadgesGrid stats={stats} />
      </Section>

      <ul className="grid gap-3 sm:grid-cols-2">
        <LinkRow
          href="/progress/words"
          icon={<Layers className="size-6" />}
          title="My words (flashcards)"
          text={stats.wordsDue > 0 ? `${stats.wordsDue} to review today` : `${stats.wordsSaved} saved · nothing due today`}
          highlight={stats.wordsDue > 0}
        />
        <LinkRow href="/progress/mistakes" icon={<NotebookPen className="size-6" />} title="Mistakes notebook" text={`${stats.mistakes} mistakes to learn from · Practice these`} />
        <LinkRow href="/practice/phrases" icon={<MessageSquareQuote className="size-6" />} title="My saved phrases" text={`${stats.phrases} phrases`} />
        <LinkRow href="/library" icon={<BookOpen className="size-6" />} title="My library" text="Books, stories and reading progress" />
      </ul>
    </div>
  );
}

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-card bg-card p-5 shadow-soft ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function LinkRow({ href, icon, title, text, highlight }: { href: string; icon: ReactNode; title: string; text: string; highlight?: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex h-full items-center gap-4 rounded-card bg-card p-4 shadow-soft ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-primary/30"
      >
        <span className={highlight ? "flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground" : "flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary"} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold group-hover:text-primary">{title}</span>
          <span className="block text-sm text-muted-foreground">{text}</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading your progress">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-card" />
        ))}
      </div>
      <CardSkeleton lines={4} />
      <CardSkeleton lines={4} />
    </div>
  );
}
