"use client";

import { BookmarkCheck, BookmarkPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { saveToAnswerBank } from "@/app/(app)/interview/actions";
import { NoteList, ScoreBadge, Speak } from "@/components/practice/shared";
import { Button } from "@/components/ui/button";
import type { AnswerFeedback } from "@/lib/interview";

/** Feedback on one answer: content, grammar, confidence, better answer + "Save to Answer Bank". */
export function FeedbackView(props: { question: string; category: string; answer: string; feedback: AnswerFeedback }) {
  const { feedback: f } = props;
  const [saved, setSaved] = useState<"no" | "saving" | "yes">("no");

  async function save() {
    setSaved("saving");
    const res = await saveToAnswerBank({
      question: props.question,
      category: props.category,
      myAnswer: props.answer,
      improved: f.better_answer,
      note: f.content.comment,
    });
    setSaved(res.ok ? "yes" : "no");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
      <section className="space-y-2 rounded-2xl bg-muted/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">📝 Content</h3>
          <ScoreBadge score={f.content.score} />
        </div>
        <p className="text-base">{f.content.comment}</p>
      </section>

      <section className="space-y-2 rounded-2xl bg-muted/60 p-4">
        <h3 className="font-bold">✏️ Grammar {f.grammar.mistakes.length === 0 && "✓"}</h3>
        {f.grammar.mistakes.length === 0 ? (
          <p className="text-base">No grammar mistakes. 👍</p>
        ) : (
          <NoteList notes={f.grammar.mistakes} />
        )}
      </section>

      <section className="space-y-2 rounded-2xl bg-muted/60 p-4 sm:col-span-2">
        <h3 className="font-bold">💪 Confident words</h3>
        <p className="text-base">{f.confidence.comment}</p>
        {f.confidence.weak_phrases.length > 0 && (
          <ul className="space-y-1">
            {f.confidence.weak_phrases.map((w, i) => (
              <li key={i} className="text-base">
                <span className="text-muted-foreground line-through">“{w.said}”</span> → <span className="font-semibold text-success">“{w.better}”</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      </div>

      <section className="space-y-2 rounded-2xl bg-primary-soft p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold">⭐ A better answer</h3>
          <Speak text={f.better_answer.slice(0, 1000)} label="Listen to the better answer" />
        </div>
        <p className="text-base leading-relaxed whitespace-pre-line">{f.better_answer}</p>
      </section>

      <Button variant="outline" onClick={save} disabled={saved !== "no"}>
        {saved === "saving" ? <Loader2 className="animate-spin" /> : saved === "yes" ? <BookmarkCheck /> : <BookmarkPlus />}
        {saved === "yes" ? "Saved to Answer Bank" : "Save to Answer Bank"}
      </Button>
    </div>
  );
}
