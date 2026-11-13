"use client";

import { SpellCheck } from "lucide-react";
import { useState } from "react";
import { runGrammarCheck } from "@/app/(app)/practice/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { Button } from "@/components/ui/button";
import { DiffText } from "@/components/ui/diff-text";
import type { GrammarResult } from "@/lib/ai";
import { Busy, ErrorBox, NoteList, Panel, ScoreBadge, TextArea } from "./shared";

/** Paste text → corrected text, mistakes (wrong → right — reason), score /10. */
export function GrammarChecker() {
  useActiveMinutes("practice");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GrammarResult | null>(null);
  const [checked, setChecked] = useState(""); // the text that was checked (for the word diff)

  async function onCheck() {
    setBusy(true);
    setError(null);
    const res = await runGrammarCheck(text);
    if (res.ok) {
      setResult(res.data);
      setChecked(text);
    }
    else setError(res.error);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <TextArea value={text} onChange={setText} rows={7} label="Your text" placeholder="Paste or write your English here… e.g. “I am working here since 2 years.”" />
      <Button size="lg" onClick={onCheck} disabled={busy || text.trim().length < 3} className="w-full sm:w-auto">
        <SpellCheck /> Check my English
      </Button>
      {busy && <Busy text="Checking…" />}
      <ErrorBox error={error} />

      {result && !busy && (
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Your text, fixed</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="text-destructive line-through">red</span> = remove · <span className="font-semibold text-success">green</span> = better
                </p>
              </div>
              <ScoreBadge score={result.score} />
            </div>
            <DiffText from={checked} to={result.corrected} className="text-base" />
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-primary">Show clean corrected text</summary>
              <p className="mt-2 text-base leading-relaxed whitespace-pre-line">{result.corrected}</p>
            </details>
          </Panel>
          <Panel title={result.mistakes.length ? `Mistakes (${result.mistakes.length})` : "No mistakes 🎉"}>
            {result.mistakes.length ? (
              <>
                <NoteList notes={result.mistakes} />
                <p className="text-sm text-muted-foreground">Saved to your mistakes notebook.</p>
              </>
            ) : (
              <p className="text-base">Your English is correct. Well done!</p>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
