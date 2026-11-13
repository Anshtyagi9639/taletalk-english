"use client";

import { BookmarkPlus, Check, ChevronDown, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeBook, setBookStatus } from "@/app/(app)/library/actions";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { celebrate, vibrate } from "@/lib/feedback";
import type { ReadingStatus } from "@/lib/books/types";
import { cn } from "@/lib/utils";

const STATUSES: { id: ReadingStatus; label: string; hint: string }[] = [
  { id: "want", label: "Want to read", hint: "Save it for later" },
  { id: "reading", label: "Reading now", hint: "Shows on Today and in Continue" },
  { id: "finished", label: "Finished", hint: "Well done! 🎉" },
];

/** "Add to shelf" button: opens a sheet with the 3 shelves + "Remove from library". */
export function BookActions({ bookId, status }: { bookId: string; status: ReadingStatus }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(status);
  const [saving, setSaving] = useState<ReadingStatus | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(next: ReadingStatus) {
    if (next === current || saving) return;
    setSaving(next);
    setError(null);
    const result = await setBookStatus(bookId, next);
    setSaving(null);
    if (result.ok) {
      setCurrent(next);
      vibrate();
      if (next === "finished") void celebrate(); // finishing a book is a big win
      setOpen(false);
      router.refresh();
    } else setError(result.error);
  }

  async function remove() {
    setRemoving(true);
    setError(null);
    const result = await removeBook(bookId);
    if (result.ok) {
      router.replace("/library");
      router.refresh();
    } else {
      setRemoving(false);
      setConfirming(false);
      setError(result.error);
    }
  }

  const label = STATUSES.find((s) => s.id === current)!.label;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirming(false);
      }}
      trigger={
        <Button variant="outline" size="lg">
          <BookmarkPlus /> {label} <ChevronDown className="opacity-60" />
        </Button>
      }
      title="Add to shelf"
      description="Where does this book go?"
    >
      <div className="space-y-4">
        <ul className="space-y-2" role="radiogroup" aria-label="Reading status">
          {STATUSES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="radio"
                aria-checked={current === s.id}
                onClick={() => changeStatus(s.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
                  current === s.id ? "border-primary bg-primary-soft" : "border-border hover:border-primary/40",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{s.label}</span>
                  <span className="block text-sm text-muted-foreground">{s.hint}</span>
                </span>
                {saving === s.id ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  current === s.id && <Check className="size-5 text-primary" aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
            {error}
          </p>
        )}

        {confirming ? (
          <div className="space-y-3 rounded-2xl bg-destructive-soft p-4">
            <p className="text-base font-semibold">Remove this book and your progress?</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)} disabled={removing}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={remove} disabled={removing}>
                {removing && <Loader2 className="animate-spin" />} Yes, remove
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirming(true)}>
            <Trash2 /> Remove from library
          </Button>
        )}
      </div>
    </Sheet>
  );
}
