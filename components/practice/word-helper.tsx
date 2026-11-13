"use client";

import { Scale, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { explainWord, whichIsCorrect } from "@/app/(app)/practice/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WhichAnswer, WordHelp } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { Busy, ErrorBox, Panel, Speak } from "./shared";

/** Two modes: explain a word/phrase, or "Which is correct?" for two options. */
export function WordHelper() {
  useActiveMinutes("practice");
  const [mode, setMode] = useState<"explain" | "which">("explain");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(
          [
            ["explain", "Explain a word"],
            ["which", "Which is correct?"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            className={cn(
              "h-11 rounded-lg border text-base font-medium",
              mode === id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === "explain" ? <Explain /> : <Which />}
    </div>
  );
}

function Explain() {
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ word: string; data: WordHelp } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const w = word.trim();
    if (!w) return;
    setBusy(true);
    setError(null);
    const res = await explainWord(w);
    if (res.ok) setResult({ word: w, data: res.data });
    else setError(res.error);
    setBusy(false);
  }

  const d = result?.data;
  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="A word or phrase, e.g. “look forward to”"
          aria-label="Word or phrase"
          className="h-12 flex-1 text-base"
        />
        <Button type="submit" disabled={busy || !word.trim()} className="h-12 px-5 text-base">
          <Search /> Explain
        </Button>
      </form>
      {busy && <Busy text="Looking it up…" />}
      <ErrorBox error={error} />

      {d && result && !busy && (
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{result.word}</h2>
              <Speak text={result.word} />
              {d.part_of_speech && <span className="text-sm text-muted-foreground">{d.part_of_speech}</span>}
            </div>
            <p className="text-base">{d.meaning}</p>
            {d.hindi && <p className="text-base">🇮🇳 {d.hindi}</p>}
          </Panel>

          <Panel title="Examples">
            <ul className="space-y-2">
              {(
                [
                  ["💼 At the office", d.examples.office],
                  ["🤝 With friends", d.examples.friends],
                  ["🎤 In an interview", d.examples.interview],
                ] as const
              ).map(([where, ex]) =>
                ex ? (
                  <li key={where}>
                    <p className="text-sm text-muted-foreground">{where}</p>
                    <p className="flex items-start gap-2 text-base">
                      <span className="flex-1">{ex}</span>
                      <Speak text={ex} />
                    </p>
                  </li>
                ) : null,
              )}
            </ul>
          </Panel>

          {d.wrong_usage.length > 0 && (
            <Panel title="Common mistakes">
              <ul className="space-y-2">
                {d.wrong_usage.map((w, i) => (
                  <li key={i} className="text-base">
                    ❌ <span className="line-through opacity-80">{w.wrong}</span>
                    <br />✅ <span className="font-medium">{w.right}</span>
                    <span className="block text-sm text-muted-foreground">{w.reason}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Formal or casual?">
            <p className="text-base">
              <span className="text-sm text-muted-foreground">Formal: </span>
              {d.formal}
            </p>
            <p className="text-base">
              <span className="text-sm text-muted-foreground">Casual: </span>
              {d.casual}
            </p>
          </Panel>

          {d.synonyms.length > 0 && (
            <Panel title="Similar words">
              <div className="flex flex-wrap gap-2">
                {d.synonyms.map((s) => (
                  <span key={s} className="rounded-full border px-3 py-1 text-base">
                    {s}
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function Which() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ a: string; b: string; data: WhichAnswer } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await whichIsCorrect(a, b, context);
    if (res.ok) setResult({ a: a.trim(), b: b.trim(), data: res.data });
    else setError(res.error);
    setBusy(false);
  }

  const verdict = (d: WhichAnswer, r: { a: string; b: string }) =>
    d.correct === "A" ? `✅ “${r.a}” is correct.` : d.correct === "B" ? `✅ “${r.b}” is correct.` : d.correct === "both" ? "✅ Both are correct." : "❌ Neither is quite right.";

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="opt-a">Option A</Label>
            <Input id="opt-a" value={a} onChange={(e) => setA(e.target.value)} placeholder="discuss about the plan" className="h-11 text-base" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="opt-b">Option B</Label>
            <Input id="opt-b" value={b} onChange={(e) => setB(e.target.value)} placeholder="discuss the plan" className="h-11 text-base" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="opt-ctx">Where do you want to use it? (optional)</Label>
          <Input id="opt-ctx" value={context} onChange={(e) => setContext(e.target.value)} placeholder="In an email to my manager" className="h-11 text-base" />
        </div>
        <Button type="submit" disabled={busy || !a.trim() || !b.trim()} className="h-12 text-base">
          <Scale /> Which is correct?
        </Button>
      </form>
      {busy && <Busy text="Thinking…" />}
      <ErrorBox error={error} />

      {result && !busy && (
        <Panel>
          <p className="text-lg font-semibold">{verdict(result.data, result)}</p>
          {result.data.best && (
            <p className="flex items-start gap-2 text-base">
              <span className="flex-1">
                Best: <span className="font-medium">{result.data.best}</span>
              </span>
              <Speak text={result.data.best} />
            </p>
          )}
          <p className="text-base">{result.data.explanation}</p>
          {result.data.examples.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-base">
              {result.data.examples.slice(0, 3).map((ex) => (
                <li key={ex}>{ex}</li>
              ))}
            </ul>
          )}
          {result.data.tip && <p className="text-sm text-muted-foreground">💡 {result.data.tip}</p>}
        </Panel>
      )}
    </div>
  );
}
