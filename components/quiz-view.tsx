"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import type { QuizQuestion } from "@/lib/quiz";
import { cn } from "@/lib/utils";

/** Multiple-choice questions with instant feedback. Calls onDone(score) when all are answered. */
export function QuizView({ questions, onDone }: { questions: QuizQuestion[]; onDone?: (correct: number) => void }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const correct = picked.filter((p, i) => p === questions[i].answer).length;

  function choose(qi: number, oi: number) {
    if (picked[qi] !== null) return;
    const next = picked.map((p, i) => (i === qi ? oi : p));
    setPicked(next);
    if (next.every((p) => p !== null)) onDone?.(next.filter((p, i) => p === questions[i].answer).length);
  }

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <fieldset key={qi} className="space-y-2">
          <legend className="text-base font-medium">
            {qi + 1}. {q.question}
          </legend>
          <div className="grid gap-2">
            {q.options.map((o, oi) => {
              const chosen = picked[qi] === oi;
              const done = picked[qi] !== null;
              const right = oi === q.answer;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={done}
                  onClick={() => choose(qi, oi)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-base transition",
                    !done && "hover:bg-muted",
                    done && right && "border-success bg-success-soft",
                    done && chosen && !right && "border-destructive bg-destructive-soft",
                  )}
                >
                  <span className="flex-1">{o}</span>
                  {done && right && <Check className="size-5 text-success" aria-label="Right answer" />}
                  {done && chosen && !right && <X className="size-5 text-destructive" aria-label="Your answer" />}
                </button>
              );
            })}
          </div>
          {picked[qi] !== null && q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
        </fieldset>
      ))}
      {answered === questions.length && questions.length > 0 && (
        <p className="rounded-lg bg-muted p-3 text-base font-medium" role="status">
          {correct} of {questions.length} right. {correct === questions.length ? "Excellent! 🎉" : "Good work, keep going! 💪"}
        </p>
      )}
    </div>
  );
}
