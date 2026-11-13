"use client";

import { Check, Layers, RotateCcw, Trash2, Volume2 } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { useState, type ReactNode } from "react";
import { deleteWord, reviewWord } from "@/app/(app)/progress/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TrophyArt } from "@/components/ui/illustrations";
import { useCanSpeak } from "@/components/voice/use-can-speak";
import type { SavedWord } from "@/lib/progress-queries";
import { speakText } from "@/lib/speech";
import { nextInterval } from "@/lib/srs";
import { vibrate } from "@/lib/feedback";

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Flashcards for words that are due. Tap the card to flip it (word ↔ meaning).
 * Swipe right = "I knew it", swipe left = "Again" (or use the two buttons).
 */
export function Flashcards({ cards }: { cards: SavedWord[] }) {
  const can = useCanSpeak();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knew, setKnew] = useState(0);
  const [leaving, setLeaving] = useState<1 | -1>(1);

  if (cards.length === 0) {
    return (
      <EmptyState icon={Layers} art={<TrophyArt className="w-40" />} title="No words to review today 🎉" text="Tap words in the Reader and press “Save word” to add more." />
    );
  }
  if (index >= cards.length) {
    return (
      <div className="rounded-sheet bg-success-soft p-6 text-center" role="status">
        <p className="text-3xl font-bold text-success">
          {knew}/{cards.length}
        </p>
        <p className="mt-1 text-base font-semibold">Done! See you tomorrow. 💪</p>
      </div>
    );
  }

  const card = cards[index];
  async function answer(ok: boolean) {
    if (ok) setKnew((k) => k + 1);
    setLeaving(ok ? 1 : -1);
    vibrate(ok ? 12 : [10, 40, 10]);
    setFlipped(false);
    setIndex((i) => i + 1);
    await reviewWord(card.id, ok, localDate());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
        <span>
          Card {index + 1} of {cards.length}
        </span>
        <span>← Again · I knew it →</span>
      </div>

      <div className="relative h-80 [perspective:1200px]">
        {index + 1 < cards.length && <div aria-hidden className="absolute inset-x-4 top-3 bottom-0 rounded-sheet bg-muted ring-1 ring-border" />}
        <AnimatePresence initial={false} custom={leaving}>
          <SwipeCard key={card.id} leaving={leaving} onAnswer={(ok) => void answer(ok)}>
            {(knewOpacity, againOpacity) => (
              <>
            {/* Swipe hints */}
            <motion.span style={{ opacity: knewOpacity }} className="pointer-events-none absolute top-4 left-4 z-10 rounded-lg border-2 border-success px-2 py-1 text-sm font-bold text-success" aria-hidden>
              I KNEW IT
            </motion.span>
            <motion.span style={{ opacity: againOpacity }} className="pointer-events-none absolute top-4 right-4 z-10 rounded-lg border-2 border-destructive px-2 py-1 text-sm font-bold text-destructive" aria-hidden>
              AGAIN
            </motion.span>

            <motion.div
              role="button"
              tabIndex={0}
              aria-pressed={flipped}
              aria-label={flipped ? `Meaning of ${card.word}: ${card.meaning}` : `${card.word}. Tap to see the meaning.`}
              onClick={() => setFlipped((f) => !f)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setFlipped((f) => !f);
                }
              }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative grid size-full rounded-sheet outline-none [transform-style:preserve-3d] focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {/* Front: the word */}
              <div className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-3 rounded-sheet bg-card p-6 text-center shadow-lift ring-1 ring-border [backface-visibility:hidden]">
                <p className="text-4xl font-bold tracking-tight">{card.word}</p>
                {card.phonetic && <p className="text-base text-muted-foreground">say: {card.phonetic}</p>}
                {can && (
                  <Button
                    variant="soft"
                    size="icon-lg"
                    className="rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(card.word, 0.9);
                    }}
                    aria-label={`Listen to ${card.word}`}
                  >
                    <Volume2 />
                  </Button>
                )}
                <p className="mt-2 text-xs font-medium text-muted-foreground">Tap to see the meaning</p>
              </div>
              {/* Back: meaning */}
              <div className="col-start-1 row-start-1 flex flex-col justify-center gap-2 rounded-sheet bg-primary-soft p-6 shadow-lift ring-1 ring-border [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <p className="text-sm font-bold text-primary">{card.word}</p>
                <p className="text-xl leading-snug font-semibold">{card.meaning}</p>
                {card.hindi && <p className="text-base">🇮🇳 {card.hindi}</p>}
                {card.example && <p className="text-base text-muted-foreground italic">“{card.example}”</p>}
              </div>
            </motion.div>

              </>
            )}
          </SwipeCard>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="lg" onClick={() => void answer(false)}>
          <RotateCcw /> Again
        </Button>
        <Button size="lg" onClick={() => void answer(true)}>
          <Check /> I knew it · {nextInterval(card.interval_days, true)}d
        </Button>
      </div>
    </div>
  );
}

/** One draggable card with its own swipe position (so the next card does not move with it). */
function SwipeCard({
  leaving,
  onAnswer,
  children,
}: {
  leaving: 1 | -1;
  onAnswer: (ok: boolean) => void;
  children: (knewOpacity: MotionValue<number>, againOpacity: MotionValue<number>) => ReactNode;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const knewOpacity = useTransform(x, [20, 120], [0, 1]);
  const againOpacity = useTransform(x, [-120, -20], [1, 0]);
  return (
    <motion.div
      custom={leaving}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      style={{ x, rotate }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 110) onAnswer(true);
        else if (info.offset.x < -110) onAnswer(false);
      }}
      initial={{ opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      // The direction comes from <AnimatePresence custom> (the card that leaves has old props).
      variants={{ gone: (dir: number) => ({ opacity: 0, x: dir * 300, rotate: dir * 15, transition: { duration: 0.25 } }) }}
      exit="gone"
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
    >
      {children(knewOpacity, againOpacity)}
    </motion.div>
  );
}

/** All my saved words, with the next review date and delete. */
export function WordList({ words }: { words: SavedWord[] }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const list = words.filter((w) => !removed.includes(w.id));
  if (list.length === 0) return <p className="text-base text-muted-foreground">No saved words yet.</p>;
  return (
    <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
      {list.map((w) => (
        <li key={w.id} className="flex items-start gap-3 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">{w.word}</p>
            <p className="text-sm text-muted-foreground">{w.meaning}</p>
            <p className="text-xs text-muted-foreground">
              Next review: {w.next_review_date} · every {w.interval_days} day{w.interval_days === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Delete ${w.word}`}
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={async () => {
              setRemoved((r) => [...r, w.id]);
              await deleteWord(w.id);
            }}
          >
            <Trash2 className="size-5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
