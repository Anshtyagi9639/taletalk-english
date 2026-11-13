"use client";

import { CheckCircle2, ChevronDown, Lightbulb, Loader2, Mic, Send, Volume2, VolumeX } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { endTalk, sendTalkMessage } from "@/app/(app)/talk/actions";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { useCanSpeak } from "@/components/voice/use-can-speak";
import { useSpeechRecognition } from "@/components/voice/use-speech-recognition";
import { transcribeRecording, useRecorder } from "@/components/voice/use-recorder";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { DiffText } from "@/components/ui/diff-text";
import { MicButton } from "@/components/ui/mic-button";
import { speakText, stopSpeaking } from "@/lib/speech";
import { synthesize } from "@/lib/tts/engine";
import type { TalkMessage, TalkSummary } from "@/lib/talk";
import { cn } from "@/lib/utils";
import { BROWSER_VOICE } from "@/lib/voices";
import { AlexAvatar } from "./talk-setup";

const AUTO_SPEAK_KEY = "taletalk.talk.autospeak";

/** "Read Alex's replies aloud" on/off, remembered in this browser. */
function useAutoSpeak() {
  const subscribe = (cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(AUTO_SPEAK_KEY, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(AUTO_SPEAK_KEY, cb);
    };
  };
  const read = () => {
    try {
      return localStorage.getItem(AUTO_SPEAK_KEY) !== "off";
    } catch {
      return true;
    }
  };
  const on = useSyncExternalStore(subscribe, read, () => true);
  const set = (value: boolean) => {
    try {
      localStorage.setItem(AUTO_SPEAK_KEY, value ? "on" : "off");
    } catch {
      // storage blocked: the setting lasts until reload
    }
    window.dispatchEvent(new Event(AUTO_SPEAK_KEY));
  };
  return [on, set] as const;
}

export function TalkRoom(props: {
  id: string;
  title: string;
  initialMessages: TalkMessage[];
  ended: boolean;
  initialSummary: TalkSummary | null;
  voice: string;
  speed: number;
}) {
  const { id, title, voice, speed } = props;
  const [messages, setMessages] = useState(props.initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"sending" | "listening" | "ending" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<TalkSummary | null>(props.initialSummary);
  const [autoSpeak, setAutoSpeak] = useAutoSpeak();
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const useNaturalVoice = useRef(voice !== BROWSER_VOICE);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const speakable = useCanSpeak();
  const ended = props.ended || summary !== null;

  useActiveMinutes("talk");

  /** Reads Alex's message aloud (natural Kokoro voice made in the browser, or the device voice). */
  const speakMessage = useCallback(
    async (text: string) => {
      stopSpeaking();
      audioRef.current?.pause();
      if (useNaturalVoice.current) {
        try {
          const url = URL.createObjectURL(await synthesize(text, voice));
          audioRef.current ??= new Audio();
          audioRef.current.src = url;
          audioRef.current.playbackRate = speed;
          audioRef.current.onended = () => URL.revokeObjectURL(url);
          await audioRef.current.play();
          return;
        } catch (err) {
          console.error("Kokoro voice failed:", err);
          useNaturalVoice.current = false;
          setVoiceNote("The natural voice is not available on this device. Using the device voice.");
        }
      }
      speakText(text, speed);
    },
    [voice, speed],
  );

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  // Read the opening message aloud.
  useEffect(() => {
    if (!(autoSpeak && props.initialMessages.length === 1 && props.initialMessages[0].role === "assistant")) return;
    const first = props.initialMessages[0].text;
    const timer = setTimeout(() => void speakMessage(first), 0);
    return () => clearTimeout(timer);
    // only once, when the chat opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any voice when leaving.
  useEffect(
    () => () => {
      stopSpeaking();
      audioRef.current?.pause();
    },
    [],
  );

  async function send(text: string, voiceInput: boolean) {
    const t = text.trim();
    if (!t || busy) return;
    setBusy("sending");
    setError(null);
    const pending: TalkMessage = { role: "user", text: t, voice: voiceInput, at: new Date().toISOString() };
    setMessages((m) => [...m, pending]);
    setInput("");
    const res = await sendTalkMessage(id, t, voiceInput);
    if (!res.ok) {
      setMessages((m) => m.filter((x) => x !== pending));
      setInput(t);
      setError(res.error);
      setBusy(null);
      return;
    }
    setMessages((m) => [...m.filter((x) => x !== pending), res.user, res.reply]);
    setBusy(null);
    if (autoSpeak) void speakMessage(res.reply.text);
  }

  const recorder = useRecorder({
    maxSeconds: 90,
    onAutoStop: (rec) => rec && void handleRecording(rec),
  });

  async function handleRecording(rec: { blob: Blob; seconds: number }) {
    setBusy("listening");
    try {
      const text = await transcribeRecording(rec, "talk.voice");
      setBusy(null);
      await send(text, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not understand the recording.");
      setBusy(null);
    }
  }

  // Live speech (free Web Speech API): words appear while I speak; sent when I tap Stop.
  const live = useSpeechRecognition((text) => void send(text, true));
  const micOn = live.listening || recorder.recording;

  async function onMic() {
    if (live.listening) {
      live.stop();
      return;
    }
    if (recorder.recording) {
      const rec = await recorder.stop();
      if (rec) await handleRecording(rec);
      return;
    }
    stopSpeaking();
    audioRef.current?.pause();
    // Chrome / Edge / Safari: live words. Other browsers: record, then free Groq Whisper.
    if (live.supported) live.start();
    else await recorder.start();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input, false);
  }

  async function onEnd() {
    setBusy("ending");
    setError(null);
    const res = await endTalk(id);
    setBusy(null);
    if (res.ok) setSummary(res.summary);
    else setError(res.error);
  }

  // Reply ideas from Alex's last message (only while it is my turn).
  const last = messages.at(-1);
  const suggestions = !ended && !busy && !micOn && last?.role === "assistant" ? (last.suggestions ?? []) : [];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AlexAvatar />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Alex · {ended ? "chat finished" : "your English buddy"}</p>
            <h1 className="truncate text-xl font-bold">{title}</h1>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAutoSpeak(!autoSpeak)}
            aria-pressed={autoSpeak}
            aria-label={autoSpeak ? "Alex speaks: on" : "Alex speaks: off"}
            title={autoSpeak ? "Alex's replies are read aloud" : "Alex's replies are not read aloud"}
          >
            {autoSpeak ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </Button>
          {!ended && (
            <Button variant="outline" onClick={onEnd} disabled={busy !== null || !messages.some((m) => m.role === "user")}>
              {busy === "ending" && <Loader2 className="animate-spin" />} End chat
            </Button>
          )}
        </div>
      </header>
      {voiceNote && <p className="text-sm text-muted-foreground">{voiceNote}</p>}

      {/* Messages: Alex on the left, me on the right */}
      <ol className="space-y-4 pt-2" aria-live="polite">
        {messages.map((m, i) => (
          <motion.li
            key={`${i}-${m.at}`}
            initial={i >= props.initialMessages.length ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}
          >
            {m.role === "assistant" ? (
              <div className="flex max-w-[88%] items-end gap-2">
                <AlexAvatar size="sm" />
                <div className="rounded-2xl rounded-bl-md bg-card px-4 py-3 text-base shadow-soft ring-1 ring-border">{m.text}</div>
                {speakable && (
                  <button
                    type="button"
                    onClick={() => void speakMessage(m.text)}
                    className="mb-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Listen"
                  >
                    <Volume2 className="size-5" />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-base text-primary-foreground shadow-soft">
                  {m.voice && <Mic className="mr-1 inline size-4 opacity-75" aria-label="spoken" />}
                  {m.text}
                </div>
                {m.correction && <CorrectionBox text={m.text} correction={m.correction} />}
              </>
            )}
          </motion.li>
        ))}
        {busy === "sending" && (
          <li className="flex items-end gap-2" aria-label="Alex is typing">
            <AlexAvatar size="sm" />
            <span className="flex gap-1 rounded-2xl rounded-bl-md bg-card px-4 py-4 shadow-soft ring-1 ring-border">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-2 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: `${d * 150}ms` }} />
              ))}
            </span>
          </li>
        )}
        {busy === "listening" && (
          <li className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Listening to your recording…
          </li>
        )}
      </ol>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}
      {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
      {live.error && <p className="text-sm text-destructive">{live.error}</p>}

      {summary && <SummaryView summary={summary} speakable={speakable} />}

      {/* Input area: reply ideas, then the mic + text box. While speaking: a big mic with the live words. */}
      {!ended && (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 space-y-2 border-t bg-background/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 md:bottom-0 lg:-mx-10 lg:px-10">
          {suggestions.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Reply ideas">
              {suggestions.map((sug) => (
                <Chip key={sug} onClick={() => setInput(sug)} className="h-9 px-3 font-medium">
                  {sug}
                </Chip>
              ))}
            </div>
          )}
          {micOn ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <p className="min-h-7 max-w-full text-center text-lg font-medium" role="status" aria-live="polite">
                {live.listening ? (
                  live.transcript || <span className="text-muted-foreground">Listening… speak now</span>
                ) : (
                  <span className="text-muted-foreground">Recording… {recorder.seconds}s</span>
                )}
              </p>
              <MicButton listening onClick={() => void onMic()} label="Stop and send" />
              <p className="text-sm text-muted-foreground">Tap to stop and send</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <MicButton listening={false} size="md" onClick={() => void onMic()} disabled={busy !== null} label="Speak" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input, false);
                  }
                }}
                rows={1}
                maxLength={1000}
                placeholder="Type your message…"
                aria-label="Your message"
                className="max-h-32 min-h-14 min-w-0 flex-1 resize-none rounded-2xl border border-input bg-card px-4 py-4 text-base shadow-soft outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="icon-lg" className="size-14 shrink-0 rounded-full" disabled={!input.trim() || busy !== null} aria-label="Send">
                <Send className="size-5" />
              </Button>
            </form>
          )}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

/** "Better way to say it" under my message: collapsible, my words → better words, one-line reason. */
function CorrectionBox({ text, correction }: { text: string; correction: TalkMessage["correction"] & object }) {
  const [open, setOpen] = useState(true);
  if (correction.ok) {
    return (
      <p className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-success">
        <CheckCircle2 className="size-4" /> Great English!
      </p>
    );
  }
  const first = correction.mistakes[0];
  return (
    <div className="mt-1.5 w-full max-w-[85%] overflow-hidden rounded-2xl bg-warm-soft text-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-2 px-3 py-2 text-left font-bold text-warm-text">
        <Lightbulb className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">Better way to say it</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="space-y-1.5 px-3 pb-3">
          {correction.better && <DiffText from={text} to={correction.better} className="text-base text-foreground" />}
          {first && (
            <p className="text-muted-foreground">
              <span className="font-semibold capitalize">{first.type}:</span> {first.reason}
            </p>
          )}
          {correction.mistakes.length > 1 && (
            <ul className="space-y-0.5 text-muted-foreground">
              {correction.mistakes.slice(1).map((m, i) => (
                <li key={i}>
                  <span className="text-destructive line-through">{m.wrong}</span> → <span className="font-semibold text-success">{m.right}</span> — {m.type}:{" "}
                  {m.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryView({ summary, speakable }: { summary: TalkSummary; speakable: boolean }) {
  return (
    <section className="space-y-5 rounded-sheet bg-card p-5 shadow-lift ring-1 ring-border sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-success-soft text-2xl" aria-hidden>
          🎉
        </span>
        <div>
          <h2 className="text-xl font-bold">Chat summary</h2>
          <p className="text-sm font-semibold text-success">All saved to Progress ✓</p>
        </div>
      </div>
      <p className="text-base">{summary.summary}</p>

      {summary.top_mistakes.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">Top mistakes to remember</h3>
          <ul className="space-y-2">
            {summary.top_mistakes.map((m, i) => (
              <li key={i} className="rounded-xl bg-muted/60 p-3 text-base">
                <span className="text-destructive line-through">{m.wrong}</span> → <span className="font-semibold text-success">{m.right}</span>
                <span className="block text-sm text-muted-foreground">
                  {m.type} · {m.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.phrases.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">5 useful phrases</h3>
          <ul className="space-y-2">
            {summary.phrases.map((p, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-primary-soft p-3">
                <div className="flex-1">
                  <p className="text-base font-semibold">“{p.phrase}”</p>
                  <p className="text-sm text-muted-foreground">{p.meaning}</p>
                </div>
                {speakable && (
                  <button
                    type="button"
                    onClick={() => speakText(p.phrase, 0.9)}
                    aria-label={`Listen to ${p.phrase}`}
                    className="flex size-9 items-center justify-center rounded-full text-primary hover:bg-card"
                  >
                    <Volume2 className="size-5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-base font-semibold">{summary.encouragement}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/talk" className={buttonVariants({ size: "lg" })}>
          New chat
        </Link>
        <Link href="/progress/mistakes" className={buttonVariants({ variant: "outline", size: "lg" })}>
          See my mistakes
        </Link>
      </div>
    </section>
  );
}
