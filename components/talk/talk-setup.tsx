"use client";

import { ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { startTalk } from "@/app/(app)/talk/actions";
import { ROLE_PLAYS, TALK_SUBJECTS, type TalkSetup as Setup } from "@/lib/talk";
import { AlexFace, ChatArt } from "@/components/ui/illustrations";
import { cn } from "@/lib/utils";

/** Pick a topic or a role-play → Alex starts the chat. */
export function TalkSetup({ dailyTopic }: { dailyTopic: string | null }) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(setup: Setup, key: string) {
    if (starting) return;
    setStarting(key);
    setError(null);
    const res = await startTalk(setup);
    if (res.ok) {
      router.push(`/talk/${res.id}`);
      return;
    }
    setError(res.error);
    setStarting(null);
  }

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}

      {/* Alex + today's topic: the one big main action */}
      <section className="relative overflow-hidden rounded-sheet bg-card p-5 shadow-soft ring-1 ring-border sm:p-6">
        <ChatArt className="pointer-events-none absolute top-1 right-3 hidden w-28 opacity-90 sm:block" />
        <div className="relative flex items-center gap-4 sm:pr-32">
          <AlexAvatar size="lg" />
          <div className="min-w-0">
            <p className="text-lg font-bold">Hi, I&apos;m Alex! 👋</p>
            <p className="text-base text-muted-foreground">Your English buddy. Talk or type — I help you say it better.</p>
          </div>
        </div>
        {dailyTopic && (
          <button
            type="button"
            onClick={() => start({ kind: "topic", topic: dailyTopic }, "daily")}
            disabled={starting !== null}
            className="mt-5 flex w-full items-center gap-4 rounded-2xl bg-primary p-4 text-left text-primary-foreground shadow-soft transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-70"
          >
            <Sparkles className="size-6 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium opacity-85">Today&apos;s topic</span>
              <span className="block text-lg font-bold">{dailyTopic}</span>
            </span>
            {starting === "daily" ? <Loader2 className="size-5 animate-spin" /> : <ChevronRight className="size-5" aria-hidden />}
          </button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Chat about…</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {TALK_SUBJECTS.map((s) => (
            <Tile key={s.id} emoji={s.emoji} label={s.label} busy={starting === s.id} disabled={starting !== null} onClick={() => start({ kind: "topic", topic: s.id }, s.id)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Role-play a situation</h2>
          <p className="text-base text-muted-foreground">Alex plays the other person. Practise what to say in real life.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ROLE_PLAYS.map((r) => (
            <Tile key={r.id} emoji={r.emoji} label={r.label} busy={starting === r.id} disabled={starting !== null} onClick={() => start({ kind: "roleplay", topic: r.id }, r.id)} tone="warm" />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Alex's avatar: a friendly round face with the brand gradient. */
export function AlexAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "size-16" : size === "md" ? "size-10" : "size-8";
  return (
    <span className={cn("flex shrink-0 rounded-full shadow-soft ring-2 ring-card", dim)} aria-hidden>
      <AlexFace className="size-full" />
    </span>
  );
}

function Tile(props: { emoji: string; label: string; busy: boolean; disabled: boolean; onClick: () => void; tone?: "primary" | "warm" }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(
        "flex min-h-28 flex-col items-start justify-between gap-2 rounded-card bg-card p-4 text-left shadow-soft ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-primary/30 active:scale-[0.98]",
        props.disabled && !props.busy && "opacity-60",
      )}
    >
      <span className="flex w-full items-center justify-between">
        <span className={cn("flex size-11 items-center justify-center rounded-xl text-2xl", props.tone === "warm" ? "bg-warm-soft" : "bg-primary-soft")} aria-hidden>
          {props.emoji}
        </span>
        {props.busy && <Loader2 className="size-5 animate-spin text-primary" />}
      </span>
      <span className="text-base leading-snug font-bold">{props.label}</span>
    </button>
  );
}
