"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createStory, type StoryLength } from "@/app/(app)/library/story-actions";
import { Button } from "@/components/ui/button";
import type { Level } from "@/lib/books/types";
import { STORY_TOPICS, type StoryTopic } from "@/lib/topics";
import { cn } from "@/lib/utils";

const STORY_LEVELS: { id: Level; label: string }[] = [
  { id: "A1", label: "A1 · very easy" },
  { id: "A2", label: "A2 · easy" },
  { id: "B1", label: "B1 · medium" },
  { id: "B2", label: "B2 · harder" },
  { id: "C1", label: "C1 · advanced" },
];
const LENGTHS: StoryLength[] = [2, 5, 10];

/** "Create a story for me": choose level, topic, length → the AI writes it → open in the Reader. */
export function CreateStory({ defaultLevel, defaultTopic }: { defaultLevel: Level; defaultTopic?: StoryTopic }) {
  const router = useRouter();
  const [level, setLevel] = useState<Level>(defaultLevel === "C2" ? "C1" : defaultLevel);
  const [topic, setTopic] = useState<StoryTopic>(defaultTopic ?? "friends");
  const [minutes, setMinutes] = useState<StoryLength>(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setBusy(true);
    setError(null);
    const res = await createStory({ level, topic, minutes });
    if (res.ok) {
      router.push(`/reader/${res.bookId}/1`);
      return;
    }
    setError(res.error);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <Choice label="Level">
        {STORY_LEVELS.map((l) => (
          <Chip key={l.id} active={level === l.id} onClick={() => setLevel(l.id)}>
            {l.label}
          </Chip>
        ))}
      </Choice>
      <Choice label="Topic">
        {STORY_TOPICS.map((t) => (
          <Chip key={t.id} active={topic === t.id} onClick={() => setTopic(t.id)}>
            {t.emoji} {t.label}
          </Chip>
        ))}
      </Choice>
      <Choice label="Length">
        {LENGTHS.map((m) => (
          <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
            {m} min
          </Chip>
        ))}
      </Choice>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}

      <Button onClick={onCreate} disabled={busy} className="h-12 w-full text-base sm:w-auto sm:px-6">
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {busy ? "Writing your story… (about 20 seconds)" : "Create my story"}
      </Button>
    </div>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-10 rounded-full border px-4 text-sm font-medium transition",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
