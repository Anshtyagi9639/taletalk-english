"use client";

import { ChevronLeft, ChevronRight, Headphones, Loader2, RotateCcw, Snail, Volume2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { getPhoneticHelp, getStorySentences, type SoundTip } from "@/app/(app)/speak/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { transcribeRecording, useRecorder } from "@/components/voice/use-recorder";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { MicButton } from "@/components/ui/mic-button";
import { ProgressRing } from "@/components/ui/progress-ring";
import { compareSpeech, type Comparison } from "@/lib/speak/compare";
import { speakText } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useSentencePlayer, type PracticeSentence } from "./use-sentence-player";

type Source = "story" | "everyday" | "tricky" | "mine";
type Mode = "practice" | "shadow";

const SOURCES: { id: Source; label: string }[] = [
  { id: "story", label: "My story" },
  { id: "everyday", label: "Everyday" },
  { id: "tricky", label: "Tricky sounds" },
  { id: "mine", label: "My sentence" },
];

/** Read aloud → compare → see missed/wrong words. Also shadowing (listen, repeat, next). */
export function SpeakPractice(props: {
  everyday: string[];
  tricky: { sound: string; sentence: string }[];
  voice: string;
}) {
  useActiveMinutes("speak");
  const player = useSentencePlayer(props.voice);
  const [source, setSource] = useState<Source>("everyday");
  const [mode, setMode] = useState<Mode>("practice");
  const [sentences, setSentences] = useState<PracticeSentence[]>(() => props.everyday.map((text) => ({ text })));
  const [heading, setHeading] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [mine, setMine] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "recording" | "checking">("idle");
  const [result, setResult] = useState<{ heard: string; cmp: Comparison } | null>(null);
  const [tips, setTips] = useState<SoundTip[] | null>(null);
  const [tipsBusy, setTipsBusy] = useState(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The sentence being recorded (saved at the start, so a later "Next" cannot mix them up). */
  const targetRef = useRef<PracticeSentence | null>(null);

  const current = sentences[index];

  const recorder = useRecorder({ maxSeconds: 30, onAutoStop: (rec) => rec && void check(rec) });

  function resetAttempt() {
    setResult(null);
    setTips(null);
    setError(null);
  }

  async function chooseSource(next: Source) {
    player.stop();
    setSource(next);
    setIndex(0);
    resetAttempt();
    setHeading(null);
    if (next === "everyday") setSentences(props.everyday.map((text) => ({ text })));
    if (next === "tricky") setSentences(props.tricky.map((t) => ({ text: t.sentence, label: `Sound: ${t.sound}` })));
    if (next === "mine") setSentences(mine.trim() ? [{ text: mine.trim() }] : []);
    if (next === "story") {
      setLoading(true);
      setSentences([]);
      const res = await getStorySentences();
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setHeading(`From “${res.bookTitle}”`);
      setSentences(res.sentences.map((s) => ({ text: s.text, chapterId: res.chapterId, p: s.p, s: s.s })));
    }
  }

  const check = useCallback(async (rec: { blob: Blob; seconds: number }) => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    const target = targetRef.current;
    if (!target) return;
    setState("checking");
    try {
      const heard = await transcribeRecording(rec, "speak.check");
      setResult({ heard, cmp: compareSpeech(target.text, heard) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not understand the recording.");
    }
    setState("idle");
  }, []);

  async function startRecording(autoStopSeconds?: number, sentence: PracticeSentence | undefined = current) {
    if (!sentence) return;
    targetRef.current = sentence;
    resetAttempt();
    player.stop();
    const ok = await recorder.start();
    if (!ok) return;
    setState("recording");
    if (autoStopSeconds) {
      stopTimer.current = setTimeout(async () => {
        const rec = await recorder.stop();
        if (rec) await check(rec);
        else setState("idle");
      }, autoStopSeconds * 1000);
    }
  }

  async function onRecordButton() {
    if (state === "recording") {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      const rec = await recorder.stop();
      if (rec) await check(rec);
      else setState("idle");
      return;
    }
    await startRecording();
  }

  /** Shadowing: play the sentence, then record automatically for about as long as it takes to say it. */
  async function shadow(i: number) {
    const s = sentences[i];
    if (!s) return;
    setIndex(i);
    resetAttempt();
    await player.play(s);
    const words = s.text.split(/\s+/).length;
    await startRecording(Math.min(20, Math.max(4, Math.ceil(words * 0.7 + 2))), s);
  }

  function go(delta: number) {
    const next = Math.min(sentences.length - 1, Math.max(0, index + delta));
    if (mode === "shadow" && delta > 0) void shadow(next);
    else {
      player.stop();
      setIndex(next);
      resetAttempt();
    }
  }

  async function onTips() {
    if (!result) return;
    const hard = result.cmp.words.filter((w) => w.status !== "ok").map((w) => w.text);
    if (hard.length === 0) return;
    setTipsBusy(true);
    const res = await getPhoneticHelp(hard);
    setTipsBusy(false);
    if (res.ok) setTips(res.data);
    else setError(res.error);
  }

  const busy = state !== "idle" || player.playing;

  return (
    <div className="space-y-5">
      {/* Where the sentences come from */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Sentences">
        {SOURCES.map((s) => (
          <Chip key={s.id} selected={source === s.id} onClick={() => void chooseSource(s.id)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Mode">
        {(
          [
            ["practice", "Read aloud"],
            ["shadow", "Shadowing"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="radio"
            aria-checked={mode === id}
            onClick={() => {
              setMode(id);
              resetAttempt();
            }}
            className={cn("h-11 rounded-lg text-base font-semibold transition", mode === id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {mode === "practice"
          ? "Listen if you want, then press the microphone and read the sentence."
          : "Press Start: you hear the sentence, then recording starts by itself. Repeat it the same way."}
      </p>

      {source === "mine" && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!mine.trim()) return;
            setSentences([{ text: mine.trim().slice(0, 300) }]);
            setIndex(0);
            resetAttempt();
          }}
        >
          <Input value={mine} onChange={(e) => setMine(e.target.value)} maxLength={300} placeholder="Type a sentence to practise" aria-label="My sentence" className="h-11 flex-1 text-base" />
          <Button type="submit" variant="secondary" className="h-11">
            Use it
          </Button>
        </form>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-base text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Getting sentences from your book…
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}
      {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      {player.note && <p className="text-sm text-muted-foreground">{player.note}</p>}

      {current && (
        <div className="space-y-6 rounded-sheet bg-card p-5 shadow-soft ring-1 ring-border sm:p-8">
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{heading ?? current.label ?? "Read this sentence"}</span>
            <span>
              {index + 1} / {sentences.length}
            </span>
          </div>

          {/* The sentence — coloured after a try */}
          <p className="py-2 text-center font-reading text-2xl leading-relaxed font-medium text-balance sm:text-3xl">
            {result ? (
              result.cmp.words.map((w, i) => (
                <span key={i}>
                  <span
                    className={cn(
                      "rounded-md px-1",
                      w.status === "ok" && "text-success",
                      w.status === "almost" && "bg-warm-soft text-warm-text",
                      w.status === "wrong" && "bg-destructive-soft text-destructive",
                      w.status === "missed" && "bg-destructive-soft text-destructive line-through decoration-2",
                    )}
                    title={w.heard ? `We heard: ${w.heard}` : w.status === "missed" ? "Not heard" : undefined}
                  >
                    {w.text}
                  </span>{" "}
                </span>
              ))
            ) : (
              current.text
            )}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="soft" onClick={() => void player.play(current, 1)} disabled={busy}>
              <Volume2 /> Listen
            </Button>
            <Button variant="soft" onClick={() => void player.play(current, 0.7)} disabled={busy}>
              <Snail /> Slow
            </Button>
          </div>

          {/* Record */}
          <div className="flex flex-col items-center gap-2 pt-2">
            {mode === "shadow" && state === "idle" && !result ? (
              <Button size="lg" onClick={() => void shadow(index)} disabled={busy}>
                <Headphones /> Start shadowing
              </Button>
            ) : (
              <MicButton
                listening={state === "recording"}
                busy={state === "checking"}
                disabled={player.playing}
                onClick={() => void onRecordButton()}
                label={state === "recording" ? "Stop recording" : "Record"}
              />
            )}
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {state === "recording" ? `Recording… ${recorder.seconds}s — read the sentence` : state === "checking" ? "Checking…" : player.playing ? "Listening…" : "Tap to record"}
            </p>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-3 rounded-2xl bg-muted/60 p-4" role="status">
              <div className="flex items-center gap-4">
                <ProgressRing
                  value={result.cmp.score}
                  size={72}
                  stroke={7}
                  tone={result.cmp.score >= 90 ? "success" : result.cmp.score >= 70 ? "warm" : "primary"}
                  label={`Score ${result.cmp.score}%`}
                >
                  <span className="text-base">{result.cmp.score}%</span>
                </ProgressRing>
                <p className="text-lg font-bold">
                  {result.cmp.score >= 90 ? "Excellent! 🎉" : result.cmp.score >= 70 ? "Good! 👍" : "Keep practising 💪"}
                </p>
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">We heard: </span>“{result.heard}”
              </p>
              <Legend />
              {result.cmp.words.some((w) => w.heard) && (
                <ul className="space-y-0.5 text-sm">
                  {result.cmp.words
                    .filter((w) => w.heard)
                    .map((w, i) => (
                      <li key={i}>
                        <span className="font-medium">{w.text.replace(/[^\p{L}\p{N}'’-]/gu, "")}</span>
                        <span className="text-muted-foreground"> — we heard “{w.heard}”</span>
                      </li>
                    ))}
                </ul>
              )}
              {result.cmp.extra.length > 0 && (
                <p className="text-sm text-muted-foreground">Extra words: {result.cmp.extra.join(", ")}</p>
              )}

              {result.cmp.words.some((w) => w.status !== "ok") && !tips && (
                <Button variant="secondary" onClick={onTips} disabled={tipsBusy}>
                  {tipsBusy && <Loader2 className="animate-spin" />} How to say these words
                </Button>
              )}
              {tips && (
                <ul className="space-y-2">
                  {tips.map((t) => (
                    <li key={t.word} className="rounded-xl bg-card p-3">
                      <p className="flex items-center gap-2">
                        <span className="text-base font-semibold">{t.word}</span>
                        <span className="text-base text-primary">{t.sounds}</span>
                        <button type="button" onClick={() => speakText(t.word, 0.7)} aria-label={`Listen to ${t.word}`} className="text-muted-foreground">
                          <Volume2 className="size-4" />
                        </button>
                      </p>
                      <p className="text-sm text-muted-foreground">{t.tip}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="lg" onClick={() => (mode === "shadow" ? void shadow(index) : void startRecording())} disabled={busy}>
                  <RotateCcw /> Try again
                </Button>
                {index < sentences.length - 1 && (
                  <Button size="lg" onClick={() => go(1)} disabled={busy}>
                    Next <ChevronRight />
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => go(-1)} disabled={index === 0 || busy}>
              <ChevronLeft /> Previous
            </Button>
            <Button variant="ghost" onClick={() => go(1)} disabled={index >= sentences.length - 1 || busy}>
              Next <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Note: this is practice feedback based on the words we heard, not an exact accent score.
      </p>
    </div>
  );
}

function Legend() {
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="font-semibold text-success">right</span>
      <span className="rounded bg-warm-soft px-1 text-warm-text">almost</span>
      <span className="rounded bg-destructive-soft px-1 text-destructive">wrong</span>
      <span className="rounded bg-destructive-soft px-1 text-destructive line-through">missed</span>
    </p>
  );
}
