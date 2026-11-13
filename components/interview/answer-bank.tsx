"use client";

import { Check, ChevronDown, Eye, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteAnswer, updateAnswer } from "@/app/(app)/interview/actions";
import { Speak } from "@/components/practice/shared";
import { Button } from "@/components/ui/button";
import type { BankItem } from "@/lib/interview-queries";
import { cn } from "@/lib/utils";

/** My saved answers. "Practice mode" hides the answers so I can try first, then check. */
export function AnswerBank({ items }: { items: BankItem[] }) {
  const [practice, setPractice] = useState(false);
  const [removed, setRemoved] = useState<string[]>([]);
  const list = items.filter((i) => !removed.includes(i.id));

  if (list.length === 0) {
    return <p className="text-base text-muted-foreground">No saved answers yet. In an interview, press “Save to Answer Bank” under the feedback.</p>;
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-base">
        <input type="checkbox" checked={practice} onChange={(e) => setPractice(e.target.checked)} className="size-5" />
        Practice mode (hide answers — try to answer aloud first)
      </label>
      <ul className="space-y-3">
        {list.map((item) => (
          <BankCard key={`${item.id}-${practice}`} item={item} practice={practice} onDelete={() => setRemoved((r) => [...r, item.id])} />
        ))}
      </ul>
    </div>
  );
}

function BankCard({ item, practice, onDelete }: { item: BankItem; practice: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [revealed, setRevealed] = useState(!practice);
  const [text, setText] = useState(item.improved_answer ?? "");
  const [save, setSave] = useState<"idle" | "saving" | "saved">("idle");

  return (
    <li className="rounded-xl border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="min-w-0 flex-1">
          {item.category && <span className="block text-xs text-muted-foreground uppercase">{item.category}</span>}
          <span className="block text-base font-semibold">{item.question}</span>
        </span>
        <ChevronDown className={cn("mt-1 size-5 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-3 border-t p-4">
          {!revealed ? (
            <Button variant="secondary" onClick={() => setRevealed(true)}>
              <Eye /> Show my answers
            </Button>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">My first answer</p>
                <p className="text-base whitespace-pre-line opacity-80">{item.my_answer}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">My best answer (edit it in your own words)</p>
                  {text && <Speak text={text.slice(0, 1000)} label="Listen to my best answer" />}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setSave("idle");
                  }}
                  rows={6}
                  maxLength={4000}
                  aria-label="My best answer"
                  className="w-full rounded-lg border border-input bg-background p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                {item.feedback && <p className="text-sm text-muted-foreground">Coach: {item.feedback}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  disabled={save !== "idle"}
                  onClick={async () => {
                    setSave("saving");
                    const r = await updateAnswer(item.id, text);
                    setSave(r.ok ? "saved" : "idle");
                  }}
                >
                  {save === "saving" ? <Loader2 className="animate-spin" /> : save === "saved" ? <Check /> : null}
                  {save === "saved" ? "Saved" : "Save changes"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground"
                  onClick={async () => {
                    onDelete();
                    await deleteAnswer(item.id);
                  }}
                >
                  <Trash2 /> Delete
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}
