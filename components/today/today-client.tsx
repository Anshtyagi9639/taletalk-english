"use client";

import { BookOpen, Check, Coffee, GraduationCap, Loader2, Mountain, RotateCw, Volume2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { markPlanDone, reviewMistake } from "@/app/(app)/today-actions";
import { BookCover } from "@/components/library/book-cover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { LevelBadge } from "@/components/ui/level-badge";
import { useCanSpeak } from "@/components/voice/use-can-speak";
import { formatMinutes, readingMinutes } from "@/lib/books/levels";
import { celebrate, vibrate } from "@/lib/feedback";
import { speakText } from "@/lib/speech";
import type { PlanBook, ReviewMistake } from "@/lib/today/queries";
import { cn } from "@/lib/utils";

export function ListenButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const can = useCanSpeak();
  if (!can) return null;
  return (
    <Button
      variant="soft"
      size="icon-lg"
      className={cn("rounded-full", className)}
      onClick={(e) => {
        e.stopPropagation();
        speakText(text, 0.9);
      }}
      aria-label={label}
    >
      <Volume2 />
    </Button>
  );
}

export function MarkDoneButton({ date, done }: { date: string; done: boolean }) {
  const [state, setState] = useState<"idle" | "saving" | "done">(done ? "done" : "idle");
  if (state === "done") {
    return (
      <span className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-success-soft px-4 text-base font-semibold text-success">
        <Check className="size-5" /> Done today
      </span>
    );
  }
  return (
    <Button
      variant="outline"
      size="lg"
      disabled={state === "saving"}
      onClick={async () => {
        setState("saving");
        const r = await markPlanDone(date);
        setState(r.ok ? "done" : "idle");
        if (r.ok) vibrate();
      }}
    >
      {state === "saving" ? <Loader2 className="animate-spin" /> : <Check />} I read it
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Today's story with the mood picker
// ---------------------------------------------------------------------------

type Mood = "relax" | "learn" | "challenge";
const MOODS = [
  { id: "relax", label: "Relax", icon: Coffee, why: "Easy and short — a calm read for today." },
  { id: "learn", label: "Learn", icon: GraduationCap, why: "" },
  { id: "challenge", label: "Challenge", icon: Mountain, why: "A step above your level — new words to learn." },
] as const;

/**
 * Today's story card. The mood chips switch between today's planned story (Learn),
 * an easier short one (Relax) and a harder one (Challenge).
 */
export function StoryOfTheDay({
  date,
  plan,
  reason,
  completed,
  storyChapter,
  relax,
  challenge,
  backup,
}: {
  date: string;
  plan: PlanBook;
  reason: string | null;
  completed: boolean;
  storyChapter: number;
  relax: PlanBook | null;
  challenge: PlanBook | null;
  backup: PlanBook | null;
}) {
  const [mood, setMood] = useState<Mood>("learn");
  const book = mood === "relax" ? relax : mood === "challenge" ? challenge : plan;
  const why = mood === "learn" ? reason : MOODS.find((m) => m.id === mood)!.why;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="How do you feel today?">
        {MOODS.map((m) => (
          <Chip key={m.id} selected={mood === m.id} onClick={() => setMood(m.id)} icon={<m.icon />} className="h-9 px-3">
            {m.label}
          </Chip>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mood}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.18 }}
        >
          {book ? (
            <div className="flex gap-4 sm:gap-5">
              <Link href={`/library/${book.id}`} className="w-24 shrink-0 self-start sm:w-32" aria-label={`About ${book.title}`}>
                <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} sizes="128px" />
              </Link>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-xl leading-snug font-bold">{book.title}</p>
                  {book.author && <p className="text-muted-foreground">{book.author}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <LevelBadge level={book.level} />
                  <span className="text-sm text-muted-foreground">{formatMinutes(readingMinutes(book.word_count))}</span>
                </div>
                {why && (
                  <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm text-foreground">
                    <span className="font-semibold text-primary">Why today:</span> {why}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-base text-muted-foreground">
              {mood === "relax" ? "No easy story in your library yet." : "No harder story in your library yet."}{" "}
              <Link href="/library/add" className="font-semibold text-primary hover:underline">
                Add books
              </Link>
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {book && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={mood === "learn" ? `/reader/${plan.id}/${storyChapter}` : `/reader/${book.id}/1`}
            className={cn(buttonVariants({ size: "lg" }), "flex-1 sm:flex-none")}
          >
            <BookOpen /> {mood === "learn" && storyChapter > 1 ? `Read chapter ${storyChapter}` : "Start reading"}
          </Link>
          {mood === "learn" && <MarkDoneButton date={date} done={completed} />}
        </div>
      )}
      {mood === "learn" && backup && (
        <p className="text-sm text-muted-foreground">
          Or try:{" "}
          <Link href={`/library/${backup.id}`} className="font-semibold text-primary hover:underline">
            {backup.title}
          </Link>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word of the day: flip card
// ---------------------------------------------------------------------------

/** Front: the word + listen. Tap to flip → back: meaning + example. */
export function WordFlipCard({ word, meaning, example }: { word: string; meaning: string; example: string | null }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="[perspective:1000px]">
      <motion.div
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={flipped ? `${word}: ${meaning}. Tap to see the word.` : `${word}. Tap to see the meaning.`}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative grid min-h-44 cursor-pointer rounded-2xl outline-none [transform-style:preserve-3d] focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {/* Front */}
        <div className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-2xl bg-primary-soft p-5 text-center [backface-visibility:hidden]">
          <p className="text-3xl font-bold tracking-tight text-foreground">{word}</p>
          <ListenButton text={word} label={`Listen to ${word}`} />
          <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <RotateCw className="size-3.5" aria-hidden /> Tap to see the meaning
          </p>
        </div>
        {/* Back */}
        <div className="col-start-1 row-start-1 flex flex-col justify-center gap-2 rounded-2xl bg-warm-soft p-5 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-sm font-bold text-warm-text">{word}</p>
          <p className="text-lg leading-snug font-semibold text-foreground">{meaning}</p>
          {example && <p className="text-base text-muted-foreground italic">“{example}”</p>}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fix yesterday's mistakes: 5-card swipe quiz
// ---------------------------------------------------------------------------

/** One card per mistake: "Which sentence is correct?" — the card slides away after each answer. */
export function MistakeReview({ mistakes }: { mistakes: ReviewMistake[] }) {
  const cards = mistakes.slice(0, 5);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<"right" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  // Show the right sentence first or second (stable per mistake, no Math.random during render).
  const rightFirst = useMemo(() => cards.map((m) => m.id.charCodeAt(0) % 2 === 0), [cards]);

  if (index >= cards.length) {
    const perfect = score === cards.length;
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-success-soft p-5 text-center" role="status">
        <p className="text-3xl font-bold text-success">
          {score}/{cards.length}
        </p>
        <p className="mt-1 text-base font-semibold">{perfect ? "Perfect! 🎉" : "Practice makes perfect! 💪"}</p>
        <Link href="/progress/mistakes" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
          See all my mistakes →
        </Link>
      </motion.div>
    );
  }

  const m = cards[index];
  const options = rightFirst[index] ? (["right", "wrong"] as const) : (["wrong", "right"] as const);

  function choose(which: "right" | "wrong") {
    if (picked) return;
    setPicked(which);
    vibrate(which === "right" ? 12 : [10, 40, 10]);
    if (which === "right") setScore((s) => s + 1);
    void reviewMistake(m.id, which === "right");
  }

  function next() {
    setPicked(null);
    if (index + 1 >= cards.length && score === cards.length) void celebrate();
    setIndex((i) => i + 1);
  }

  return (
    <div className="space-y-3">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5" aria-label={`Card ${index + 1} of ${cards.length}`}>
        {cards.map((c, i) => (
          <span key={c.id} className={cn("h-1.5 flex-1 rounded-full", i < index ? "bg-primary" : i === index ? "bg-primary/50" : "bg-muted")} />
        ))}
      </div>

      {/* The card stack: a second card peeks out behind the current one. */}
      <div className="relative">
        {index + 1 < cards.length && <div aria-hidden className="absolute inset-x-3 -bottom-2 h-full rounded-2xl bg-muted ring-1 ring-border" />}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: picked === "wrong" ? -120 : 120, rotate: picked === "wrong" ? -6 : 6 }}
            transition={{ duration: 0.25 }}
            className="relative space-y-3 rounded-2xl bg-card p-4 ring-1 ring-border"
          >
            <p className="text-sm font-semibold text-muted-foreground">Which sentence is correct?</p>
            <div className="grid gap-2">
              {options.map((which) => {
                const text = which === "right" ? m.right : m.wrong;
                const show = picked !== null;
                return (
                  <button
                    key={which}
                    type="button"
                    disabled={show}
                    onClick={() => choose(which)}
                    className={cn(
                      "flex min-h-12 items-center gap-2 rounded-xl border-2 px-4 py-2 text-left text-base transition-colors active:scale-[0.99]",
                      !show && "border-border hover:border-primary/40 hover:bg-primary-soft",
                      show && which === "right" && "border-success bg-success-soft font-semibold",
                      show && picked === which && which === "wrong" && "border-destructive bg-destructive-soft",
                      show && picked !== which && which === "wrong" && "border-border opacity-60",
                    )}
                  >
                    <span className="flex-1">{text}</span>
                    {show && which === "right" && <Check className="size-5 text-success" aria-label="Correct" />}
                    {show && picked === which && which === "wrong" && <X className="size-5 text-destructive" aria-label="Not correct" />}
                  </button>
                );
              })}
            </div>
            {picked && m.reason && <p className="text-sm text-muted-foreground">{m.reason}</p>}
          </motion.div>
        </AnimatePresence>
      </div>
      {picked && (
        <Button size="lg" className="w-full" onClick={next}>
          {index + 1 < cards.length ? "Next card" : "See my score"}
        </Button>
      )}
    </div>
  );
}
