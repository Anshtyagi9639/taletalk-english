"use client";

import { Loader2, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useCanSpeak } from "@/components/voice/use-can-speak";
import { speakText } from "@/lib/speech";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { Note } from "@/lib/practice";

/** wrong → right — type: reason (one line per mistake). */
export function NoteList({ notes }: { notes: (Omit<Note, "type"> & { type?: string })[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-2">
      {notes.map((n, i) => (
        <li key={i} className="rounded-xl bg-muted/60 p-3 text-base">
          <span className="text-destructive line-through">{n.wrong}</span> →{" "}
          <span className="font-semibold text-success">{n.right}</span>
          <span className="block text-sm text-muted-foreground">
            {n.type ? `${n.type} · ` : ""}
            {n.reason}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Score out of 10 as an animated ring (green 8+, amber 5+, else indigo). */
export function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 8 ? "success" : score >= 5 ? "warm" : "primary";
  return (
    <ProgressRing value={score * 10} size={64} stroke={6} tone={tone} label={`Score ${score} of 10`}>
      <span className="text-base">
        {score}
        <span className="text-[10px] font-medium text-muted-foreground">/10</span>
      </span>
    </ProgressRing>
  );
}

export function Speak({ text, label }: { text: string; label?: string }) {
  const can = useCanSpeak();
  if (!can) return null;
  return (
    <button
      type="button"
      onClick={() => speakText(text, 0.9)}
      aria-label={label ?? `Listen: ${text}`}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-primary hover:bg-primary-soft"
    >
      <Volume2 className="size-5" />
    </button>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
      {error}
    </p>
  );
}

export function Busy({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-base text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" /> {text}
    </p>
  );
}

export function TextArea(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  label: string;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      rows={props.rows ?? 6}
      maxLength={props.maxLength ?? 6000}
      placeholder={props.placeholder}
      aria-label={props.label}
      className="w-full rounded-2xl border border-input bg-card p-4 text-base shadow-soft outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

export function Panel({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-card bg-card p-5 shadow-soft ring-1 ring-border">
      {title && <h2 className="text-lg font-bold">{title}</h2>}
      {children}
    </section>
  );
}
