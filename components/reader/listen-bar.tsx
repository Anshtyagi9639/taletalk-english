"use client";

import { Loader2, Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceDownload } from "@/components/voice/voice-download";
import { BROWSER_VOICE, KOKORO_VOICES, SPEEDS } from "@/lib/voices";
import type { ListenStatus } from "./use-listen";

/** Player controls shown at the bottom while listening. */
export function ListenBar(props: {
  status: ListenStatus;
  index: number;
  total: number;
  error: string | null;
  voice: string;
  speed: number;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onVoice: (voice: string) => void;
  onSpeed: (speed: number) => void;
}) {
  const { status, index, total, error, voice, speed } = props;
  const playing = status === "playing" || status === "loading";
  const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];

  return (
    <div
      role="region"
      aria-label="Listen"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl space-y-2 rounded-2xl bg-popover/95 p-3 shadow-lift ring-1 ring-border backdrop-blur-xl md:bottom-6 md:rounded-2xl md:border"
    >
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-lg" onClick={props.onPrev} disabled={index <= 0} aria-label="Previous sentence">
          <SkipBack className="size-5" />
        </Button>
        <Button size="icon-lg" className="size-12 rounded-full" onClick={props.onPlayPause} aria-label={playing ? "Pause" : "Play"}>
          {status === "loading" ? (
            <Loader2 className="size-6 animate-spin" />
          ) : playing ? (
            <Pause className="size-6" />
          ) : (
            <Play className="size-6" />
          )}
        </Button>
        <Button variant="ghost" size="icon-lg" onClick={props.onNext} disabled={index < 0 || index >= total - 1} aria-label="Next sentence">
          <SkipForward className="size-5" />
        </Button>

        <Button
          variant="outline"
          className="h-10 w-16 text-sm tabular-nums"
          onClick={() => props.onSpeed(nextSpeed)}
          aria-label={`Speed ${speed}x. Tap to change.`}
        >
          {speed}x
        </Button>

        <select
          value={voice}
          onChange={(e) => props.onVoice(e.target.value)}
          aria-label="Voice"
          className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value={BROWSER_VOICE}>Device voice</option>
          <optgroup label="Natural voices (free, download once)">
            {KOKORO_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </optgroup>
        </select>

        <Button variant="ghost" size="icon-lg" onClick={props.onStop} aria-label="Stop listening">
          <X className="size-5" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {status === "loading" ? "Getting the voice ready…" : `Sentence ${Math.max(0, index) + 1} of ${total}`}
      </p>
      <VoiceDownload />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
