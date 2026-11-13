"use client";

import { Check, CircleAlert, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addGutenbergBook } from "@/app/(app)/library/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STARTER_BOOKS } from "@/lib/books/starters";

type State = "adding" | "done" | "error";

/**
 * The 9 preloaded classics. "Add all" adds them one by one and shows progress.
 * Each book is downloaded from Project Gutenberg, so this takes about a minute.
 */
export function StarterBooks({ addedIds }: { addedIds: number[] }) {
  const router = useRouter();
  const [states, setStates] = useState<Record<number, State>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [running, setRunning] = useState(false);

  const isAdded = (id: number) => addedIds.includes(id) || states[id] === "done";
  const missing = STARTER_BOOKS.filter((b) => !isAdded(b.gutenbergId));
  const doneCount = STARTER_BOOKS.length - missing.length;

  async function add(ids: number[]) {
    setRunning(true);
    for (const id of ids) {
      setStates((s) => ({ ...s, [id]: "adding" }));
      const result = await addGutenbergBook(id);
      setStates((s) => ({ ...s, [id]: result.ok ? "done" : "error" }));
      if (!result.ok) setErrors((e) => ({ ...e, [id]: result.error }));
    }
    setRunning(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-muted-foreground">
          {doneCount} of {STARTER_BOOKS.length} added
        </p>
        {missing.length > 0 && (
          <Button size="lg" className="h-11 px-4 text-base" disabled={running} onClick={() => add(missing.map((b) => b.gutenbergId))}>
            {running ? <Loader2 className="animate-spin" /> : <Plus />}
            {running ? "Adding… please wait" : `Add ${missing.length === STARTER_BOOKS.length ? "all" : "the other"} ${missing.length}`}
          </Button>
        )}
      </div>

      <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
        {STARTER_BOOKS.map((b) => {
          const state = isAdded(b.gutenbergId) ? "done" : states[b.gutenbergId];
          return (
            <li key={b.gutenbergId} className="flex items-center gap-3 p-3">
              <Badge className="w-9 justify-center">{b.level}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium">{b.title}</p>
                <p className="truncate text-sm text-muted-foreground">{b.author}</p>
                {state === "error" && <p className="text-sm text-destructive">{errors[b.gutenbergId]}</p>}
              </div>
              {state === "done" && <Check className="size-5 text-success" aria-label="Added" />}
              {state === "adding" && <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Adding" />}
              {state === "error" && <CircleAlert className="size-5 text-destructive" aria-label="Error" />}
              {!state && (
                <Button variant="outline" disabled={running} onClick={() => add([b.gutenbergId])}>
                  Add
                </Button>
              )}
              {state === "error" && !running && (
                <Button variant="outline" onClick={() => add([b.gutenbergId])}>
                  Try again
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
