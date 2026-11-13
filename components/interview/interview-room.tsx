"use client";

import { Briefcase, Check, ChevronRight, Flag, Lightbulb, Loader2, Send, Timer, Volume2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { answerQuestion, endInterview } from "@/app/(app)/interview/actions";
import { useSentencePlayer } from "@/components/speak/use-sentence-player";
import { useActiveMinutes } from "@/components/use-active-minutes";
import { transcribeRecording, useRecorder } from "@/components/voice/use-recorder";
import { Button, buttonVariants } from "@/components/ui/button";
import { MicButton } from "@/components/ui/mic-button";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { InterviewMode, InterviewQuestion, InterviewReport, InterviewTurn } from "@/lib/interview";
import { cn } from "@/lib/utils";
import { FeedbackView } from "./feedback-view";

/** One practice interview: questions one at a time, answer by text or voice, feedback, report. */
export function InterviewRoom(props: {
  id: string;
  mode: InterviewMode;
  questions: InterviewQuestion[];
  initialTurns: InterviewTurn[];
  initialReport: InterviewReport | null;
  voice: string;
}) {
  useActiveMinutes("interview");
  const { id, mode, questions } = props;
  const isMock = mode === "mock";
  const player = useSentencePlayer(props.voice);
  const [turns, setTurns] = useState(props.initialTurns);
  const [report, setReport] = useState(props.initialReport);
  const firstOpen = Math.max(0, questions.findIndex((_, i) => !props.initialTurns.some((t) => t.index === i)));
  const [index, setIndex] = useState(props.initialReport ? 0 : firstOpen);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState<"sending" | "listening" | "ending" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showFeedback, setShowFeedback] = useState(!isMock);
  // Optional answer timer (counts up while I answer; resets for each question).
  const [timerOn, setTimerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const q = questions[index];
  const turn = turns.find((t) => t.index === index);
  const ended = report !== null;
  const recorder = useRecorder({ maxSeconds: 120, onAutoStop: (rec) => rec && void fromRecording(rec) });

  useEffect(() => {
    if (!timerOn || turn || report) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [timerOn, turn, report, index]);

  // The interviewer reads each new question aloud (not after the interview).
  useEffect(() => {
    if (ended || !q || turn) return;
    const timer = setTimeout(() => void player.play({ text: q.question }), 300);
    return () => clearTimeout(timer);
    // only when the question changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  async function submit(text: string, voice: boolean) {
    setBusy("sending");
    setError(null);
    const res = await answerQuestion(id, index, text, voice);
    setBusy(null);
    if (!res.ok) {
      setError(res.error);
      if (!voice) setAnswer(text);
      return;
    }
    setTurns((ts) => [...ts.filter((t) => t.index !== index), res.turn]);
    setAnswer("");
    setShowFeedback(!isMock);
  }

  async function fromRecording(rec: { blob: Blob; seconds: number }) {
    setBusy("listening");
    try {
      const text = await transcribeRecording(rec, "interview.voice");
      setBusy(null);
      await submit(text, true);
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "We could not understand the recording.");
    }
  }

  async function onMic() {
    if (recorder.recording) {
      const rec = await recorder.stop();
      if (rec) await fromRecording(rec);
      return;
    }
    player.stop();
    await recorder.start();
  }

  function goTo(i: number) {
    player.stop();
    setIndex(i);
    setElapsed(0);
    setShowHint(false);
    setShowFeedback(!isMock);
    setError(null);
  }

  async function finish() {
    setBusy("ending");
    setError(null);
    const res = await endInterview(id);
    setBusy(null);
    if (res.ok) setReport(res.report);
    else setError(res.error);
  }

  const nextOpen = questions.findIndex((_, i) => i > index && !turns.some((t) => t.index === i));
  const allDone = turns.length === questions.length;
  const answering = !turn && !ended;

  return (
    <div className="space-y-5">
      {/* Question stepper: a progress bar + numbers */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span className="text-muted-foreground">{turns.length} answered</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(turns.length / questions.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Questions">
          {questions.map((_, i) => {
            const done = turns.some((t) => t.index === i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}${done ? " (answered)" : ""}`}
                aria-current={i === index}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-sm font-bold transition",
                  done ? "bg-success-soft text-success" : "bg-muted text-muted-foreground hover:text-foreground",
                  i === index && "bg-primary text-primary-foreground ring-3 ring-primary/25",
                )}
              >
                {done && i !== index ? <Check className="size-4" /> : i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {report && <ReportView report={report} />}

      {q && (
        <section className="space-y-5 rounded-sheet bg-card p-5 shadow-soft ring-1 ring-border sm:p-6">
          {/* Interviewer card */}
          <div className="flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-hero shadow-soft" aria-hidden>
              <Briefcase className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-muted-foreground capitalize">Interviewer · {q.type}</p>
                <div className="flex items-center gap-1">
                  {answering && (
                    <button
                      type="button"
                      onClick={() => setTimerOn((t) => !t)}
                      aria-pressed={timerOn}
                      className={cn(
                        "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-sm font-semibold tabular-nums transition",
                        timerOn ? (elapsed > 120 ? "bg-destructive-soft text-destructive" : "bg-warm-soft text-warm-text") : "text-muted-foreground hover:bg-muted",
                      )}
                      title="Timer: aim for 1–2 minutes"
                    >
                      <Timer className="size-4" /> {timerOn ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` : "Timer"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void player.play({ text: q.question })}
                    aria-label="Listen to the question"
                    className="flex size-9 items-center justify-center rounded-full text-primary hover:bg-primary-soft"
                  >
                    <Volume2 className="size-5" />
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xl leading-relaxed font-bold">{q.question}</p>
            </div>
          </div>
          {player.note && <p className="text-sm text-muted-foreground">{player.note}</p>}

          {answering && (
            <>
              {showHint ? (
                <p className="rounded-xl bg-warm-soft p-3 text-sm">💡 {q.hint}</p>
              ) : (
                <Button variant="ghost" onClick={() => setShowHint(true)}>
                  <Lightbulb /> Hint
                </Button>
              )}

              {recorder.recording ? (
                <div className="flex flex-col items-center gap-3 py-4" role="status">
                  <MicButton listening onClick={() => void onMic()} label="Stop and send" />
                  <p className="text-base font-medium">Recording… {recorder.seconds}s · tap to finish</p>
                </div>
              ) : (
                <>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={6}
                    maxLength={4000}
                    placeholder="Type your answer… or tap the microphone and speak."
                    aria-label="Your answer"
                    className="w-full rounded-2xl border border-input bg-background p-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <MicButton listening={false} size="md" busy={busy === "listening"} onClick={() => void onMic()} disabled={busy !== null} label="Speak your answer" />
                    <Button size="lg" className="flex-1 sm:flex-none" onClick={() => void submit(answer, false)} disabled={busy !== null || answer.trim().split(/\s+/).length < 3}>
                      {busy === "sending" ? <Loader2 className="animate-spin" /> : <Send />} Send answer
                    </Button>
                  </div>
                </>
              )}
              {busy === "listening" && <p className="text-sm text-muted-foreground">Listening to your answer…</p>}
              {busy === "sending" && <p className="text-sm text-muted-foreground">The coach is reading your answer…</p>}
              {recorder.error && <p className="text-sm text-destructive">{recorder.error}</p>}
            </>
          )}

          {turn && (
            <div className="space-y-3">
              <div className="rounded-2xl bg-primary-soft p-4">
                <p className="mb-1 text-xs font-bold tracking-wide text-primary uppercase">Your answer {turn.voice && "(spoken)"}</p>
                <p className="text-base whitespace-pre-line">{turn.answer}</p>
              </div>
              {turn.feedback &&
                (showFeedback || ended ? (
                  <FeedbackView question={q.question} category={q.type} answer={turn.answer} feedback={turn.feedback} />
                ) : (
                  <Button variant="soft" onClick={() => setShowFeedback(true)}>
                    Show feedback now (or wait for the report)
                  </Button>
                ))}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
              {error}
            </p>
          )}

          {!ended && (
            <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
              {turn && nextOpen >= 0 ? (
                <Button size="lg" onClick={() => goTo(nextOpen)}>
                  Next question <ChevronRight />
                </Button>
              ) : !turn && index < questions.length - 1 ? (
                <Button variant="ghost" onClick={() => goTo(index + 1)}>
                  Skip <ChevronRight />
                </Button>
              ) : (
                <span />
              )}
              <Button variant={allDone ? "default" : "outline"} size={allDone ? "lg" : "default"} onClick={finish} disabled={busy !== null || turns.length === 0}>
                {busy === "ending" ? <Loader2 className="animate-spin" /> : <Flag />} {allDone ? "Get my report" : "End interview"}
              </Button>
            </div>
          )}
        </section>
      )}

      {ended && (
        <div className="flex flex-wrap gap-2">
          <Link href="/interview" className={buttonVariants({ size: "lg" })}>
            New interview
          </Link>
          <Link href="/interview/bank" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Answer Bank
          </Link>
        </div>
      )}
    </div>
  );
}

function ReportView({ report }: { report: InterviewReport }) {
  return (
    <section className="space-y-4 rounded-sheet bg-card p-5 shadow-lift ring-1 ring-border sm:p-6">
      <div className="flex items-center gap-4">
        <ProgressRing value={report.score * 10} size={80} stroke={8} tone={report.score >= 8 ? "success" : report.score >= 5 ? "warm" : "primary"} label={`Score ${report.score} of 10`}>
          <span className="text-lg">
            {report.score}
            <span className="text-xs font-medium text-muted-foreground">/10</span>
          </span>
        </ProgressRing>
        <div>
          <h2 className="text-xl font-bold">Your interview report</h2>
          <p className="text-base text-muted-foreground">{report.overall}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {report.strengths.length > 0 && (
          <div className="rounded-2xl bg-success-soft p-4">
            <h3 className="font-bold">💪 Strengths</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
              {report.strengths.map((st) => (
                <li key={st}>{st}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="rounded-2xl bg-warm-soft p-4">
          <h3 className="font-bold">🎯 3 things to improve</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-base">
            {report.improve.map((st) => (
              <li key={st}>{st}</li>
            ))}
          </ol>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Tap a question number above to see each answer and its feedback.</p>
    </section>
  );
}
