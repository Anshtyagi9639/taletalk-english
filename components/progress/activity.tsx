import { BookCheck, Briefcase, Flame, Library, MessageCircle, Mic, Sparkles, Timer, Trophy, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** GitHub-style activity map: one square per day, darker = more minutes. Weeks go left → right. */
export function ActivityHeatmap({ days }: { days: { date: string; total: number }[] }) {
  // Pad the start so the first column begins on a Sunday.
  const firstDay = new Date(`${days[0].date}T12:00:00Z`).getUTCDay();
  const cells: ({ date: string; total: number } | null)[] = [...Array.from({ length: firstDay }, () => null), ...days];
  const level = (m: number) => (m === 0 ? 0 : m < 10 ? 1 : m < 20 ? 2 : m < 40 ? 3 : 4);
  const COLORS = ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"];

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1 [scrollbar-width:thin]">
        <ol className="grid w-max grid-flow-col grid-rows-7 gap-1" aria-label="Minutes practised per day, last 18 weeks">
          {cells.map((c, i) =>
            c ? (
              <li key={c.date} title={`${c.date}: ${c.total} min`} aria-label={`${c.date}: ${c.total} minutes`} className={cn("size-3.5 rounded-[4px] sm:size-4", COLORS[level(c.total)])} />
            ) : (
              <li key={`pad-${i}`} aria-hidden className="size-3.5 sm:size-4" />
            ),
          )}
        </ol>
      </div>
      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
        Less
        {COLORS.map((c) => (
          <span key={c} className={cn("size-3 rounded-[3px]", c)} aria-hidden />
        ))}
        More
      </p>
    </div>
  );
}

export type BadgeStats = {
  booksFinished: number;
  bestStreak: number;
  wordsSaved: number;
  totalMinutes: number;
  totals: Record<string, number>;
  mistakes: number;
};

type Badge = { id: string; icon: LucideIcon; title: string; goal: string; done: (s: BadgeStats) => boolean };

const BADGES: Badge[] = [
  { id: "first-book", icon: BookCheck, title: "First book", goal: "Finish 1 book", done: (s) => s.booksFinished >= 1 },
  { id: "bookworm", icon: Library, title: "Bookworm", goal: "Finish 5 books", done: (s) => s.booksFinished >= 5 },
  { id: "streak-7", icon: Flame, title: "7-day streak", goal: "Practise 7 days in a row", done: (s) => s.bestStreak >= 7 },
  { id: "streak-30", icon: Trophy, title: "30-day streak", goal: "Practise 30 days in a row", done: (s) => s.bestStreak >= 30 },
  { id: "words-10", icon: Type, title: "10 words", goal: "Save 10 words", done: (s) => s.wordsSaved >= 10 },
  { id: "words-100", icon: Sparkles, title: "100 words", goal: "Save 100 words", done: (s) => s.wordsSaved >= 100 },
  { id: "chatter", icon: MessageCircle, title: "Chatter", goal: "Talk with Alex for 60 min", done: (s) => (s.totals.talk ?? 0) >= 60 },
  { id: "speaker", icon: Mic, title: "Clear speaker", goal: "Speak practice for 60 min", done: (s) => (s.totals.speak ?? 0) >= 60 },
  { id: "interview", icon: Briefcase, title: "Interview ready", goal: "Interview practice for 30 min", done: (s) => (s.totals.interview ?? 0) >= 30 },
  { id: "hours-10", icon: Timer, title: "10 hours", goal: "Practise 10 hours in total", done: (s) => s.totalMinutes >= 600 },
];

/** Achievements: earned ones in warm amber, the rest gray with the goal. */
export function BadgesGrid({ stats }: { stats: BadgeStats }) {
  const earned = BADGES.filter((b) => b.done(stats)).length;
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground">
        {earned} of {BADGES.length} earned
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {BADGES.map((b) => {
          const done = b.done(stats);
          return (
            <li
              key={b.id}
              className={cn("flex flex-col items-center gap-2 rounded-2xl p-4 text-center", done ? "bg-warm-soft" : "bg-muted/60")}
              aria-label={`${b.title}: ${done ? "earned" : `not yet — ${b.goal}`}`}
            >
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-full",
                  done ? "bg-warm text-warm-foreground shadow-soft" : "bg-card text-muted-foreground ring-1 ring-border",
                )}
                aria-hidden
              >
                <b.icon className="size-6" />
              </span>
              <span className={cn("text-sm font-bold", !done && "text-muted-foreground")}>{b.title}</span>
              <span className="text-xs text-muted-foreground">{done ? "Earned ✓" : b.goal}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
