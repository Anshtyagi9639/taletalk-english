"use client";

import { Heart, MessageSquareQuote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSituationPhrases, savePhrase } from "@/app/(app)/practice/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { SITUATIONS, TONES, type PhraseSet, type Tone } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { Busy, ErrorBox, Panel, Speak } from "./shared";

/** Choose a situation + tone → 8-10 phrases + "Don't say → Say instead". Save favourites. */
export function PhraseFinder() {
  useActiveMinutes("practice");
  const router = useRouter();
  const [situation, setSituation] = useState<string>(SITUATIONS[0]);
  const [custom, setCustom] = useState("");
  const [tone, setTone] = useState<Tone>("polite");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ situation: string; data: PhraseSet } | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const chosen = custom.trim() || situation;

  async function onGet() {
    setBusy(true);
    setError(null);
    const res = await getSituationPhrases(chosen, tone);
    if (res.ok) {
      setResult({ situation: chosen, data: res.data });
      setSaved({});
    } else setError(res.error);
    setBusy(false);
  }

  async function onSave(phrase: string, note: string) {
    if (!result) return;
    const res = await savePhrase(result.situation, phrase, note);
    if (res.ok) {
      setSaved((s) => ({ ...s, [phrase]: true }));
      router.refresh(); // update "My saved phrases" below
    }
  }

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Situation</legend>
        <select
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          aria-label="Situation"
          disabled={Boolean(custom.trim())}
          className="h-12 w-full rounded-lg border border-input bg-background px-3 text-base disabled:opacity-50"
        >
          {SITUATIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={150}
          placeholder="…or type your own situation"
          aria-label="Your own situation"
          className="h-11 text-base"
        />
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tone</legend>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <Chip key={t.id} selected={tone === t.id} onClick={() => setTone(t.id)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Button size="lg" onClick={onGet} disabled={busy} className="w-full sm:w-auto">
        <MessageSquareQuote /> Show me phrases
      </Button>
      {busy && <Busy text="Finding good phrases…" />}
      <ErrorBox error={error} />

      {result && !busy && (
        <div className="space-y-4">
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Phrases: {result.situation}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {result.data.phrases.map((p) => (
                <li key={p.phrase} className="flex flex-col gap-3 rounded-card bg-card p-4 shadow-soft ring-1 ring-border">
                  <p className="text-lg leading-snug font-semibold">“{p.phrase}”</p>
                  <p className="flex-1 text-sm text-muted-foreground">{p.when}</p>
                  <div className="flex items-center justify-end gap-1">
                    <Speak text={p.phrase} />
                    <button
                      type="button"
                      onClick={() => onSave(p.phrase, p.when)}
                      disabled={saved[p.phrase]}
                      aria-pressed={Boolean(saved[p.phrase])}
                      aria-label={saved[p.phrase] ? "Saved to favourites" : "Save to favourites"}
                      className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive-soft hover:text-destructive disabled:text-destructive"
                    >
                      <Heart className={cn("size-5", saved[p.phrase] && "fill-current")} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          {result.data.dont_say.length > 0 && (
            <Panel title="Don't say → Say instead">
              <ul className="space-y-3">
                {result.data.dont_say.map((d, i) => (
                  <li key={i} className="space-y-1 rounded-xl bg-muted/60 p-3 text-base">
                    <span className="block">
                      ❌ <span className="text-destructive line-through">{d.dont}</span>
                    </span>
                    <span className="block">
                      ✅ <span className="font-semibold text-success">{d.say}</span>
                    </span>
                    <span className="block text-sm text-muted-foreground">{d.reason}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
