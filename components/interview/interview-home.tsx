"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { saveInterviewProfile, startInterview } from "@/app/(app)/interview/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPERIENCE, MODES, type InterviewMode, type InterviewProfile } from "@/lib/interview";

/** My job role / experience / topics (used to make the questions). */
export function InterviewProfileForm({ initial }: { initial: InterviewProfile }) {
  const router = useRouter();
  const [role, setRole] = useState(initial.role);
  const [experience, setExperience] = useState(initial.experience);
  const [topics, setTopics] = useState(initial.topics.join(", "));
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setState("saving");
    setError(null);
    const res = await saveInterviewProfile({ role, experience, topics: topics.split(",") });
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      setError(res.error);
      setState("idle");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-card bg-card shadow-soft ring-1 ring-border p-4">
      <h2 className="text-lg font-semibold">My interview profile</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="iv-role">Job role</Label>
          <Input id="iv-role" value={role} onChange={(e) => { setRole(e.target.value); setState("idle"); }} placeholder="e.g. Frontend developer" maxLength={80} className="h-11 text-base" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="iv-exp">Experience</Label>
          <select
            id="iv-exp"
            value={experience}
            onChange={(e) => { setExperience(e.target.value); setState("idle"); }}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
          >
            <option value="">Choose…</option>
            {EXPERIENCE.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="iv-topics">Tech topics I am learning (comma between them)</Label>
        <Input id="iv-topics" value={topics} onChange={(e) => { setTopics(e.target.value); setState("idle"); }} placeholder="e.g. React, JavaScript, SQL" className="h-11 text-base" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="secondary" disabled={state === "saving"}>
        {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <Check /> : null}
        {state === "saved" ? "Saved" : "Save"}
      </Button>
    </form>
  );
}

/** The three interview types. */
export function InterviewModes() {
  const router = useRouter();
  const [starting, setStarting] = useState<InterviewMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(mode: InterviewMode) {
    setStarting(mode);
    setError(null);
    const res = await startInterview(mode);
    if (res.ok) {
      router.push(`/interview/${res.id}`);
      return;
    }
    setError(res.error);
    setStarting(null);
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            disabled={starting !== null}
            onClick={() => start(m.id)}
            className="flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition hover:bg-muted/50 disabled:opacity-60 bg-card"
          >
            <span className="flex w-full items-center justify-between text-2xl" aria-hidden>
              {m.emoji}
              {starting === m.id && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
            </span>
            <span className="text-base font-semibold">{m.title}</span>
            <span className="text-sm text-muted-foreground">{m.text}</span>
            <span className="text-xs text-muted-foreground">{m.count} questions</span>
          </button>
        ))}
      </div>
      {starting && <p className="text-sm text-muted-foreground">Preparing your questions…</p>}
    </div>
  );
}
