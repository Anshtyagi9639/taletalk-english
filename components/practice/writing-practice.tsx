"use client";

import { Lightbulb, PenLine, RotateCcw, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { checkWriting, continueStoryTogether, startStoryTogether } from "@/app/(app)/practice/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WRITING_IDEAS, type Note, type WritingResult } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { Busy, ErrorBox, NoteList, Panel, ScoreBadge, TextArea } from "./shared";

/** Two modes: free writing (checked paragraph by paragraph) and "write a story together". */
export function WritingPractice() {
  useActiveMinutes("practice");
  const [mode, setMode] = useState<"free" | "story">("free");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="tablist">
        {(
          [
            ["free", "Free writing"],
            ["story", "Write a story"],
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
      {mode === "free" ? <FreeWriting /> : <StoryTogether />}
    </div>
  );
}

function FreeWriting() {
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WritingResult | null>(null);

  function newIdea() {
    const others = WRITING_IDEAS.filter((i) => i !== topic);
    setTopic(others[Math.floor(Math.random() * others.length)]);
  }

  async function onCheck() {
    setBusy(true);
    setError(null);
    const res = await checkWriting(text, topic);
    if (res.ok) setResult(res.data);
    else setError(res.error);
    setBusy(false);
  }

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" aria-label="Topic" className="h-11 flex-1 text-base" />
        <Button type="button" variant="outline" onClick={newIdea} className="h-11">
          <Lightbulb /> Idea
        </Button>
      </div>
      <TextArea
        value={text}
        onChange={setText}
        rows={10}
        label="Your writing"
        placeholder="Write a few paragraphs. Leave an empty line between paragraphs."
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{words} words</span>
        <Button onClick={onCheck} disabled={busy || words < 5} className="h-12 text-base">
          <PenLine /> Correct my writing
        </Button>
      </div>
      {busy && <Busy text="Reading your text… (longer texts take up to 30 seconds)" />}
      <ErrorBox error={error} />

      {result && !busy && (
        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">How did I do?</h2>
              <ScoreBadge score={result.score} />
            </div>
            <p className="text-base">{result.overall}</p>
            {result.tip && <p className="text-sm text-muted-foreground">💡 {result.tip}</p>}
          </Panel>
          {result.paragraphs.map((p, i) => (
            <Panel key={i} title={`Paragraph ${i + 1}${p.notes.length === 0 ? " ✓" : ""}`}>
              {p.notes.length === 0 ? (
                <p className="text-base">Correct! 🎉</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Corrected:</p>
                  <p className="text-base leading-relaxed">{p.corrected}</p>
                  <NoteList notes={p.notes} />
                </>
              )}
            </Panel>
          ))}
          <p className="text-sm text-muted-foreground">Mistakes are saved to your notebook.</p>
        </div>
      )}
    </div>
  );
}

type Part = { who: "ai" | "me"; text: string; notes?: Note[]; praise?: string };

function StoryTogether() {
  const [title, setTitle] = useState<string | null>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [mine, setMine] = useState("");
  const [busy, setBusy] = useState<"start" | "turn" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setBusy("start");
    setError(null);
    const res = await startStoryTogether();
    if (res.ok) {
      setTitle(res.data.title);
      setParts([{ who: "ai", text: res.data.opening }]);
    } else setError(res.error);
    setBusy(null);
  }

  async function onSend() {
    setBusy("turn");
    setError(null);
    // The story so far uses the CORRECTED versions of my parts.
    const soFar = parts.map((p) => p.text).join("\n\n");
    const res = await continueStoryTogether(soFar, mine);
    if (res.ok) {
      setParts((ps) => [
        ...ps,
        { who: "me", text: res.data.corrected || mine.trim(), notes: res.data.notes, praise: res.data.praise },
        { who: "ai", text: res.data.next_part },
      ]);
      setMine("");
    } else setError(res.error);
    setBusy(null);
  }

  if (!title) {
    return (
      <div className="space-y-3">
        <p className="text-base">The AI starts a story. You write what happens next. The AI corrects your part and continues. Take turns!</p>
        <Button onClick={onStart} disabled={busy !== null} className="h-12 text-base">
          <Sparkles /> Start a story
        </Button>
        {busy === "start" && <Busy text="Starting a story…" />}
        <ErrorBox error={error} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button
          variant="ghost"
          onClick={() => {
            setTitle(null);
            setParts([]);
          }}
        >
          <RotateCcw /> New story
        </Button>
      </div>
      <ol className="space-y-3">
        {parts.map((p, i) => (
          <li key={i} className={cn("rounded-xl p-3", p.who === "ai" ? "bg-muted" : "border border-primary/30 bg-primary/5")}>
            <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{p.who === "ai" ? "AI" : "You (corrected)"}</p>
            <p className="text-base leading-relaxed">{p.text}</p>
            {p.praise && <p className="mt-2 text-sm">👏 {p.praise}</p>}
            {p.notes && p.notes.length > 0 && (
              <div className="mt-2">
                <NoteList notes={p.notes} />
              </div>
            )}
          </li>
        ))}
      </ol>
      <TextArea value={mine} onChange={setMine} rows={4} maxLength={2000} label="Your part" placeholder="What happens next? Write 2-5 sentences." />
      <Button onClick={onSend} disabled={busy !== null || mine.trim().split(/\s+/).length < 3} className="h-12 text-base">
        <Send /> Send my part
      </Button>
      {busy === "turn" && <Busy text="Reading your part…" />}
      <ErrorBox error={error} />
    </div>
  );
}
