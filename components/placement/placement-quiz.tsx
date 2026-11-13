"use client";

import { ArrowRight, Loader2, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { chooseLevel, submitPlacement } from "@/app/(app)/placement/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { LEVELS, type Level } from "@/lib/books/types";
import { PLACEMENT_QUESTIONS } from "@/lib/placement/questions";
import { INTERESTS } from "@/lib/topics";
import { cn } from "@/lib/utils";

const LEVEL_TEXT: Record<Level, string> = {
  A1: "Beginner – you know simple words and sentences.",
  A2: "Elementary – you can talk about everyday things.",
  B1: "Intermediate – you can handle most daily situations.",
  B2: "Upper intermediate – you can talk about many topics with confidence.",
  C1: "Advanced – you understand long and difficult texts.",
  C2: "Proficient – your English is very close to a native speaker’s.",
};

type Step = "intro" | "quiz" | "interests" | "saving" | "done";

/** 5-minute level test → interests → result. "I know my level" skips the test. */
export function PlacementQuiz({ currentLevel, currentInterests }: { currentLevel: Level; currentInterests: string[] }) {
  const [step, setStep] = useState<Step>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => PLACEMENT_QUESTIONS.map(() => null));
  const [manualLevel, setManualLevel] = useState<Level | null>(null);
  const [interests, setInterests] = useState<string[]>(currentInterests);
  const [result, setResult] = useState<{ level: Level; right: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function answer(option: number | null) {
    const next = answers.map((a, i) => (i === index ? option : a));
    setAnswers(next);
    if (index + 1 < PLACEMENT_QUESTIONS.length) setIndex(index + 1);
    else setStep("interests");
  }

  async function finish() {
    setStep("saving");
    setError(null);
    const res = manualLevel ? await chooseLevel(manualLevel, interests) : await submitPlacement(answers, interests);
    if (!res.ok) {
      setError(res.error);
      setStep("interests");
      return;
    }
    setResult(res);
    setStep("done");
  }

  if (step === "intro") {
    return (
      <div className="space-y-6">
        <div className="space-y-3 rounded-card bg-card shadow-soft ring-1 ring-border p-4">
          <p className="text-base">
            20 short questions, from easy to hard. It takes about 5 minutes. If you do not know an answer, press “I don’t know” — that is
            fine!
          </p>
          <Button className="h-12 text-base" onClick={() => setStep("quiz")}>
            Start the test <ArrowRight />
          </Button>
        </div>
        <div className="space-y-3 rounded-card bg-card shadow-soft ring-1 ring-border p-4">
          <p className="text-base font-medium">I already know my level</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={manualLevel === l}
                onClick={() => setManualLevel(l)}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-medium",
                  manualLevel === l ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {manualLevel && <p className="text-sm text-muted-foreground">{LEVEL_TEXT[manualLevel]}</p>}
          <Button variant="outline" disabled={!manualLevel} onClick={() => setStep("interests")}>
            Use {manualLevel ?? "this level"} <ArrowRight />
          </Button>
          <p className="text-sm text-muted-foreground">Now: {currentLevel}</p>
        </div>
      </div>
    );
  }

  if (step === "quiz") {
    const q = PLACEMENT_QUESTIONS[index];
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Question {index + 1} of {PLACEMENT_QUESTIONS.length}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(index / PLACEMENT_QUESTIONS.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-xl font-semibold">{q.question}</p>
        <div className="grid gap-2">
          {q.options.map((o, i) => (
            <button
              key={o}
              type="button"
              onClick={() => answer(i)}
              className="min-h-12 rounded-lg border px-4 py-2 text-left text-base transition hover:bg-muted"
            >
              {o}
            </button>
          ))}
          <button type="button" onClick={() => answer(null)} className="min-h-11 rounded-lg px-4 text-left text-base text-muted-foreground hover:bg-muted">
            I don’t know
          </button>
        </div>
        {index > 0 && (
          <Button variant="ghost" onClick={() => setIndex(index - 1)}>
            Back
          </Button>
        )}
      </div>
    );
  }

  if (step === "interests" || step === "saving") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xl font-semibold">What do you like to read about?</p>
          <p className="text-base text-muted-foreground">Choose a few. We use them to pick your daily story.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = interests.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                aria-pressed={on}
                onClick={() => setInterests((list) => (on ? list.filter((x) => x !== i.id) : [...list, i.id]))}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-medium",
                  on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {i.label}
              </button>
            );
          })}
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
            {error}
          </p>
        )}
        <Button className="h-12 text-base" onClick={finish} disabled={step === "saving"}>
          {step === "saving" ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {step === "saving" ? "Saving…" : "See my level"}
        </Button>
      </div>
    );
  }

  // done
  return (
    <div className="space-y-5 rounded-xl border p-5 text-center bg-card">
      <PartyPopper className="mx-auto size-10 text-primary" aria-hidden />
      <p className="text-base text-muted-foreground">Your level is</p>
      <p className="text-5xl font-bold">{result?.level}</p>
      {result && <p className="text-base">{LEVEL_TEXT[result.level]}</p>}
      {result && result.total > 0 && (
        <p className="text-sm text-muted-foreground">
          {result.right} of {result.total} right
        </p>
      )}
      <p className="text-sm text-muted-foreground">Your level will change as you learn. You can also change it in Settings.</p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-12 px-6 text-base")}>
        Go to Today <ArrowRight />
      </Link>
    </div>
  );
}
