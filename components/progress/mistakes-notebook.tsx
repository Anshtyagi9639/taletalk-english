"use client";

import { Dumbbell, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteMistake } from "@/app/(app)/progress/actions";
import { MistakeReview } from "@/components/today/today-client";
import { Button } from "@/components/ui/button";
import type { MistakeRow } from "@/lib/progress-queries";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  talk: "Talk",
  interview: "Interview",
  "reader.retell": "Reader",
  "practice.grammar": "Grammar checker",
  "practice.writing": "Writing",
  "practice.story": "Story writing",
};

/** Mistakes grouped by type, with a filter, delete, and "Practice my mistakes". */
export function MistakesNotebook({ mistakes }: { mistakes: MistakeRow[] }) {
  const [type, setType] = useState<string>("all");
  const [removed, setRemoved] = useState<string[]>([]);
  const [practising, setPractising] = useState(false);

  const list = mistakes.filter((m) => !removed.includes(m.id));
  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of list) c.set(m.type, (c.get(m.type) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]);
  }, [list]);
  const shown = type === "all" ? list : list.filter((m) => m.type === type);
  // Practice: the ones I got right least often first.
  const quiz = useMemo(
    () => [...shown].sort((a, b) => a.correct_count - b.correct_count).slice(0, 10),
    // only when I start practising
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [practising, type],
  );

  if (list.length === 0) {
    return <p className="rounded-xl bg-muted p-4 text-base">Your notebook is empty. Mistakes from Talk, Practice, Interview and the Reader will appear here.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Types */}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type of mistake">
        {[["all", list.length] as const, ...counts].map(([t, n]) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => {
              setType(t);
              setPractising(false);
            }}
            className={cn(
              "h-10 rounded-full border px-4 text-sm font-medium capitalize",
              type === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {t === "all" ? "All" : t} ({n})
          </button>
        ))}
      </div>

      {practising ? (
        <div className="space-y-3 rounded-card bg-card shadow-soft ring-1 ring-border p-4">
          <MistakeReview key={`${type}-${quiz.length}`} mistakes={quiz} />
          <Button variant="ghost" onClick={() => setPractising(false)}>
            Back to the list
          </Button>
        </div>
      ) : (
        <Button className="h-12 text-base" onClick={() => setPractising(true)}>
          <Dumbbell /> Practise my mistakes ({Math.min(10, shown.length)} questions)
        </Button>
      )}

      <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
        {shown.map((m) => (
          <li key={m.id} className="flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1 text-base">
              <span className="text-destructive line-through">{m.wrong}</span> →{" "}
              <span className="font-medium text-success">{m.right}</span>
              {m.reason && <span className="block text-sm text-muted-foreground">{m.reason}</span>}
              <span className="block text-xs text-muted-foreground">
                {m.type} · {SOURCE_LABELS[m.source_feature] ?? m.source_feature} · {m.created_at.slice(0, 10)}
                {m.review_count > 0 && ` · practised ${m.review_count}× (${m.correct_count} right)`}
              </span>
            </div>
            <button
              type="button"
              aria-label="Delete mistake"
              className="shrink-0 text-muted-foreground hover:text-destructive"
              onClick={async () => {
                setRemoved((r) => [...r, m.id]);
                await deleteMistake(m.id);
              }}
            >
              <Trash2 className="size-5" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
