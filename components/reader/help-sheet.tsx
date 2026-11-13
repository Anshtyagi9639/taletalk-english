"use client";

import { BookmarkCheck, BookmarkPlus, Loader2, RotateCw, Volume2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  explainSelection,
  lookupWord,
  saveWord,
  type SentenceHelp,
  type WordInfo,
} from "@/app/(app)/reader/actions";
import { Button } from "@/components/ui/button";
import { canSpeak, speakText } from "@/lib/speech";

export type Panel =
  | { type: "word"; word: string; sentence: string }
  | { type: "sentence"; kind: SentenceHelp; text: string };

const SENTENCE_TITLES: Record<SentenceHelp, string> = {
  explain: "Explain simply",
  hindi: "Translate to Hindi",
  grammar: "Grammar of this sentence",
};

/** Answers already loaded in this visit (so tapping the same word again is free and instant). */
const cache = new Map<string, unknown>();

/** Bottom sheet with AI help for a tapped word or a selected sentence. */
export function HelpSheet({ panel, bookId, onClose }: { panel: Panel; bookId: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={panel.type === "word" ? `Meaning of ${panel.word}` : SENTENCE_TITLES[panel.kind]}
      className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[65dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border bg-popover p-4 text-popover-foreground shadow-2xl md:bottom-6 md:rounded-2xl"
    >
      <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Close" className="absolute top-2 right-2">
        <X className="size-5" />
      </Button>
      {panel.type === "word" ? (
        <WordHelp key={`${panel.word}|${panel.sentence}`} word={panel.word} sentence={panel.sentence} bookId={bookId} />
      ) : (
        <SentenceHelpView key={`${panel.kind}|${panel.text}`} kind={panel.kind} text={panel.text} />
      )}
    </div>
  );
}

/** Loads an AI answer once (with the visit cache) and gives loading / error / retry. */
function useAiAnswer<T>(cacheKey: string, load: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>) {
  const [state, setState] = useState<{ data?: T; error?: string; attempt: number }>(() => ({
    data: cache.get(cacheKey) as T | undefined,
    attempt: 0,
  }));
  const loading = state.data === undefined && state.error === undefined;

  useEffect(() => {
    if (cache.has(cacheKey)) return;
    let cancelled = false;
    load().then((res) => {
      if (cancelled) return;
      if (res.ok) cache.set(cacheKey, res.data);
      setState((s) => (res.ok ? { ...s, data: res.data } : { ...s, error: res.error }));
    });
    return () => {
      cancelled = true;
    };
    // `load` is a new function each render; the key and attempt decide when to load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, state.attempt]);

  const retry = () => setState((s) => ({ attempt: s.attempt + 1 }));
  return { data: state.data, error: state.error, loading, retry };
}

function ListenButton({ text, label }: { text: string; label: string }) {
  if (!canSpeak()) return null;
  return (
    <Button variant="outline" size="icon-lg" onClick={() => speakText(text, 0.9)} aria-label={label}>
      <Volume2 className="size-5" />
    </Button>
  );
}

function WordHelp({ word, sentence, bookId }: { word: string; sentence: string; bookId: string }) {
  const key = `word|${word.toLowerCase()}|${sentence}`;
  const { data, error, loading, retry } = useAiAnswer<WordInfo>(key, () => lookupWord(word, sentence));
  const [saved, setSaved] = useState<"no" | "saving" | "saved" | "already" | "error">("no");

  async function onSave() {
    if (!data) return;
    setSaved("saving");
    const res = await saveWord({
      word: data.base_form || word,
      meaning: data.meaning_here,
      example: data.example,
      phonetic: data.phonetic,
      hindi: data.hindi,
      sentence,
      bookId,
    });
    setSaved(res.ok ? (res.already ? "already" : "saved") : "error");
  }

  return (
    <div className="space-y-3 pr-10">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-bold">{word}</h2>
        <ListenButton text={word} label={`Listen to ${word}`} />
      </div>

      {loading && <Loading text="Looking up the meaning…" />}
      {error && <ErrorBox error={error} onRetry={retry} />}

      {data && (
        <>
          <p className="text-sm text-muted-foreground">
            {[data.part_of_speech, data.phonetic && `say: ${data.phonetic}`, data.base_form !== word.toLowerCase() && data.base_form && `from “${data.base_form}”`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Section title="Meaning here">{data.meaning_here}</Section>
          {data.hindi && <Section title="Hindi">{data.hindi}</Section>}
          <Section title="Example">
            <span className="flex items-start gap-2">
              <span className="flex-1 italic">“{data.example}”</span>
              <ListenButton text={data.example} label="Listen to the example" />
            </span>
          </Section>
          {data.note && <Section title="Tip">{data.note}</Section>}

          <Button
            onClick={onSave}
            disabled={saved === "saving" || saved === "saved" || saved === "already"}
            className="h-11 w-full text-base"
          >
            {saved === "saving" ? <Loader2 className="animate-spin" /> : saved === "saved" || saved === "already" ? <BookmarkCheck /> : <BookmarkPlus />}
            {saved === "saved" ? "Saved to my words" : saved === "already" ? "Already in my words" : "Save word"}
          </Button>
          {saved === "error" && <p className="text-sm text-destructive">Could not save. Please try again.</p>}
        </>
      )}
    </div>
  );
}

function SentenceHelpView({ kind, text }: { kind: SentenceHelp; text: string }) {
  const { data, error, loading, retry } = useAiAnswer<string>(`${kind}|${text}`, () => explainSelection(kind, text));
  return (
    <div className="space-y-3 pr-10">
      <h2 className="text-xl font-bold">{SENTENCE_TITLES[kind]}</h2>
      <blockquote className="border-l-4 pl-3 text-base text-muted-foreground italic">{text}</blockquote>
      {loading && <Loading text="Thinking…" />}
      {error && <ErrorBox error={error} onRetry={retry} />}
      {data && <p className="text-base leading-relaxed whitespace-pre-line">{data}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <div className="text-base leading-relaxed">{children}</div>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-base text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" /> {text}
    </p>
  );
}

function ErrorBox({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-2 rounded-xl bg-destructive-soft p-3 text-base text-destructive">
      <p>{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RotateCw /> Try again
      </Button>
    </div>
  );
}
