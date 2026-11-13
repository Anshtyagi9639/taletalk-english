"use client";

import { ClipboardCheck, Loader2, MessageSquareText, Volume2 } from "lucide-react";
import { useState } from "react";
import { checkRetelling, getChapterCheck, type ChapterCheck, type RetellResult } from "@/app/(app)/reader/actions";
import { QuizView } from "@/components/quiz-view";
import { Button } from "@/components/ui/button";
import { canSpeak, speakText } from "@/lib/speech";

/** After a chapter: summary, key words, 3 questions, and "tell the story in your own words". */
export function ChapterCheckCard({ chapterId }: { chapterId: string }) {
  const [check, setCheck] = useState<ChapterCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await getChapterCheck(chapterId);
    if (res.ok) setCheck(res.data);
    else setError(res.error);
    setLoading(false);
  }

  if (!check) {
    return (
      <div className="space-y-2 rounded-card bg-card shadow-soft ring-1 ring-border p-4">
        <p className="text-base font-semibold">Finished this chapter?</p>
        <p className="text-sm text-muted-foreground">Check what you understood and tell the story in your own words.</p>
        <Button onClick={load} disabled={loading} className="h-11 text-base">
          {loading ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
          {loading ? "Getting questions ready…" : "Check my understanding"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-card bg-card shadow-soft ring-1 ring-border p-4">
      {check.summary && (
        <section className="space-y-1">
          <h2 className="text-lg font-semibold">What happened</h2>
          <p className="text-base leading-relaxed">{check.summary}</p>
        </section>
      )}

      {check.keyWords.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Key words</h2>
          <ul className="space-y-2">
            {check.keyWords.map((k) => (
              <li key={k.word} className="rounded-lg bg-muted/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold">{k.word}</span>
                  {canSpeak() && (
                    <button type="button" onClick={() => speakText(k.word, 0.9)} aria-label={`Listen to ${k.word}`} className="text-muted-foreground">
                      <Volume2 className="size-4" />
                    </button>
                  )}
                </div>
                <p className="text-base">{k.meaning}</p>
                {k.example && <p className="text-sm text-muted-foreground italic">“{k.example}”</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {check.questions.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Questions</h2>
          <QuizView questions={check.questions} />
        </section>
      )}

      <Retell chapterId={chapterId} />
    </div>
  );
}

function Retell({ chapterId }: { chapterId: string }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RetellResult | null>(null);

  async function onCheck() {
    setBusy(true);
    setError(null);
    const res = await checkRetelling(chapterId, text);
    if (res.ok) setResult(res.data);
    else setError(res.error);
    setBusy(false);
  }

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MessageSquareText className="size-5" /> Tell the story in your own words
      </h2>
      <p className="text-sm text-muted-foreground">Write 3-6 sentences. The AI checks your understanding and your English.</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        maxLength={3000}
        placeholder="In this chapter…"
        className="w-full rounded-lg border border-input bg-background p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button onClick={onCheck} disabled={busy || text.trim().length < 10} className="h-11 text-base">
        {busy && <Loader2 className="animate-spin" />}
        {busy ? "Checking…" : "Check my story"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-3 rounded-lg bg-muted/60 p-3" role="status">
          <p className="text-base font-semibold">Score: {result.score} / 10</p>
          <p className="text-base">{result.content_feedback}</p>
          {result.mistakes.length > 0 ? (
            <>
              <p className="text-sm font-semibold">Better way to say it</p>
              <ul className="space-y-2">
                {result.mistakes.map((m, i) => (
                  <li key={i} className="text-base">
                    <span className="text-destructive line-through">{m.wrong}</span> → <span className="font-medium text-success">{m.right}</span>
                    <span className="block text-sm text-muted-foreground">
                      {m.type} · {m.reason}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-sm font-semibold">Your text, corrected</p>
              <p className="text-base whitespace-pre-line">{result.corrected}</p>
              <p className="text-sm text-muted-foreground">These mistakes were saved to your notebook (Progress).</p>
            </>
          ) : (
            <p className="text-base">No English mistakes. Great job! 🎉</p>
          )}
        </div>
      )}
    </section>
  );
}
