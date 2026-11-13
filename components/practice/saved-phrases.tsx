"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deletePhrase } from "@/app/(app)/practice/actions";
import { Speak } from "./shared";

export type SavedPhrase = { id: string; situation: string; phrase: string; usage_note: string | null };

/** My saved phrases, grouped by situation, with Listen and Delete. */
export function SavedPhrases({ phrases }: { phrases: SavedPhrase[] }) {
  const [removed, setRemoved] = useState<string[]>([]);
  const list = phrases.filter((p) => !removed.includes(p.id));
  if (list.length === 0) {
    return <p className="text-base text-muted-foreground">No saved phrases yet. Tap the bookmark next to a phrase to save it.</p>;
  }
  const groups = new Map<string, SavedPhrase[]>();
  for (const p of list) groups.set(p.situation, [...(groups.get(p.situation) ?? []), p]);

  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([situation, items]) => (
        <div key={situation} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{situation}</h3>
          <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
            {items.map((p) => (
              <li key={p.id} className="flex items-start gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium">“{p.phrase}”</p>
                  {p.usage_note && <p className="text-sm text-muted-foreground">{p.usage_note}</p>}
                </div>
                <Speak text={p.phrase} />
                <button
                  type="button"
                  aria-label="Delete phrase"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    setRemoved((r) => [...r, p.id]);
                    await deletePhrase(p.id);
                  }}
                >
                  <Trash2 className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
