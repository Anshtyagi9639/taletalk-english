"use client";

import { ArrowLeftRight, CheckCircle2, Languages, Lightbulb, Volume2 } from "lucide-react";
import { useState } from "react";
import { translatePractice } from "@/app/(app)/practice/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { Button } from "@/components/ui/button";
import { useCanSpeak } from "@/components/voice/use-can-speak";
import { TRANSLATE_EXAMPLES, type TranslateDirection, type TranslateResult } from "@/lib/practice";
import { speakText } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { Busy, ErrorBox, Panel, TextArea } from "./shared";

const DIRECTIONS: { id: TranslateDirection; label: string; hint: string }[] = [
  { id: "en-hi", label: "English → हिंदी", hint: "Write in English. We correct it and show it in Hindi, so you can check your meaning." },
  {
    id: "hi-en",
    label: "हिंदी → English",
    hint: "Write in Hindi (हिंदी or Roman letters). We show the right English and how to build it.",
  },
];

/** Translate & Learn: English ⇄ Hindi, made for a learner who thinks in Hindi. */
export function TranslatePractice() {
  useActiveMinutes("practice");
  const can = useCanSpeak();
  const [direction, setDirection] = useState<TranslateDirection>("hi-en");
  const [text, setText] = useState("");
  const [myTry, setMyTry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ direction: TranslateDirection; input: string; myTry: string; data: TranslateResult } | null>(null);

  function switchDirection(next: TranslateDirection) {
    setDirection(next);
    setText("");
    setMyTry("");
    setError(null);
    setResult(null);
  }

  async function onCheck() {
    setBusy(true);
    setError(null);
    const res = await translatePractice(direction, text, direction === "hi-en" ? myTry : "");
    if (res.ok) setResult({ direction, input: text.trim(), myTry: myTry.trim(), data: res.data });
    else setError(res.error);
    setBusy(false);
  }

  const d = result?.data;
  const checkedMyEnglish = result && (result.direction === "en-hi" || result.myTry);

  return (
    <div className="space-y-5">
      {/* Direction */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Direction">
        {DIRECTIONS.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={direction === x.id}
            onClick={() => switchDirection(x.id)}
            className={cn(
              "h-12 rounded-xl border text-base font-semibold transition",
              direction === x.id ? "border-primary bg-primary text-primary-foreground shadow-sm" : "bg-card hover:bg-muted",
            )}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">{DIRECTIONS.find((x) => x.id === direction)?.hint}</p>

      {/* Input */}
      <div className="space-y-3">
        <TextArea
          value={text}
          onChange={setText}
          rows={3}
          maxLength={1000}
          label={direction === "en-hi" ? "Your English sentence" : "आपका हिंदी वाक्य (your Hindi sentence)"}
          placeholder={direction === "en-hi" ? "e.g. I am working here since two years." : "जैसे: मैं कल बाज़ार गया था।  /  main kal market gaya tha"}
        />
        {direction === "hi-en" && (
          <div className="space-y-1">
            <label htmlFor="my-try" className="text-sm font-medium">
              My English try (optional) — we will check it
            </label>
            <TextArea value={myTry} onChange={setMyTry} rows={2} maxLength={1000} label="My English try" placeholder="e.g. Yesterday I gone to market." />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onCheck} disabled={busy || text.trim().length < 2} className="h-12 px-5 text-base">
            <Languages /> {direction === "en-hi" ? "Check & translate" : "Show me the English"}
          </Button>
          <span className="text-sm text-muted-foreground">Try:</span>
          {TRANSLATE_EXAMPLES[direction].slice(0, 2).map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setText(ex)}
              className="max-w-full truncate rounded-full border bg-card px-3 py-1 text-sm hover:bg-muted"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {busy && <Busy text="Thinking in both languages…" />}
      <ErrorBox error={error} />

      {d && result && !busy && (
        <div className="space-y-4">
          {/* Both sides */}
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
            <SideCard
              label="English"
              text={d.english}
              onListen={can ? () => speakText(d.english, 0.9) : undefined}
              tone="blue"
            />
            <div className="hidden items-center justify-center md:flex" aria-hidden>
              <ArrowLeftRight className="size-5 text-muted-foreground" />
            </div>
            <SideCard
              label="हिंदी"
              text={d.hindi}
              sub={d.hindi_roman}
              onListen={can ? () => speakText(d.hindi, 0.9, "hi-IN") : undefined}
              tone="amber"
            />
          </div>

          {/* My English: correct or not */}
          {checkedMyEnglish && (
            <Panel>
              {d.is_correct && d.mistakes.length === 0 ? (
                <p className="flex items-center gap-2 text-base font-semibold text-success">
                  <CheckCircle2 className="size-5" /> Your English is correct! बहुत बढ़िया! 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold">Your English — better way to say it</h2>
                  <p className="text-base">
                    <span className="text-muted-foreground line-through">{result.direction === "en-hi" ? result.input : result.myTry}</span>
                    <br />
                    <span className="font-semibold text-success">{d.english}</span>
                  </p>
                  <ul className="space-y-2">
                    {d.mistakes.map((m, i) => (
                      <li key={i} className="rounded-lg bg-muted/60 p-3">
                        <p className="text-base">
                          <span className="text-destructive line-through">{m.wrong}</span> →{" "}
                          <span className="font-semibold text-success">{m.right}</span>
                          <span className="text-sm text-muted-foreground"> · {m.type}</span>
                        </p>
                        <p className="text-sm">{m.reason}</p>
                        {m.reason_hindi && <p className="text-sm text-muted-foreground">🇮🇳 {m.reason_hindi}</p>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground">Saved to your mistakes notebook.</p>
                </div>
              )}
            </Panel>
          )}

          {/* How to build it */}
          {d.pattern.formula && (
            <Panel title="For this sentence, we say it like this">
              <p className="rounded-xl bg-primary/10 px-4 py-3 text-center font-mono text-base font-semibold text-primary">{d.pattern.formula}</p>
              {d.pattern.name && <p className="text-sm text-muted-foreground">{d.pattern.name}</p>}
              {d.pattern.explain_hindi && <p className="text-base">🇮🇳 {d.pattern.explain_hindi}</p>}
            </Panel>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {d.word_map.length > 0 && (
              <Panel title="Word map">
                <ul className="divide-y">
                  {d.word_map.map((w, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2 text-base">
                      <span>{w.hindi}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-right font-medium">{w.english}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
            {d.other_ways.length > 0 && (
              <Panel title="Other ways to say it">
                <ul className="space-y-2">
                  {d.other_ways.map((o, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-medium">“{o.english}”</p>
                        <p className="text-sm text-muted-foreground">{o.when}</p>
                      </div>
                      {can && (
                        <button type="button" onClick={() => speakText(o.english, 0.9)} aria-label={`Listen: ${o.english}`} className="text-muted-foreground hover:text-foreground">
                          <Volume2 className="size-5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          {d.hindi_trap && (
            <div className="flex gap-3 rounded-card bg-warm-soft p-4 text-foreground">
              <Lightbulb className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Hindi speakers often make this mistake</p>
                <p className="text-base">{d.hindi_trap}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SideCard({
  label,
  text,
  sub,
  onListen,
  tone,
}: {
  label: string;
  text: string;
  sub?: string;
  onListen?: () => void;
  tone: "blue" | "amber";
}) {
  return (
    <section
      className={cn(
        "space-y-2 rounded-2xl border p-4",
        tone === "blue" ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30" : "bg-warm-soft",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</p>
        {onListen && (
          <button type="button" onClick={onListen} aria-label={`Listen (${label})`} className="text-muted-foreground hover:text-foreground">
            <Volume2 className="size-5" />
          </button>
        )}
      </div>
      <p className="text-lg leading-relaxed font-medium">{text}</p>
      {sub && <p className="text-sm text-muted-foreground italic">{sub}</p>}
    </section>
  );
}
