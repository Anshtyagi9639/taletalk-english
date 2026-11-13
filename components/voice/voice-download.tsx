"use client";

import { useSyncExternalStore } from "react";
import { voiceStatus, type VoiceStatus } from "@/lib/tts/engine";

const SERVER: VoiceStatus = { state: "idle", percent: 0, device: null, error: null };

export function useVoiceStatus() {
  return useSyncExternalStore(voiceStatus.subscribe, voiceStatus.get, () => SERVER);
}

/** "Downloading voice (first time only)" progress bar. Shows only while the model downloads. */
export function VoiceDownload({ className }: { className?: string }) {
  const s = useVoiceStatus();
  if (s.state === "downloading") {
    return (
      <div className={className} role="status" aria-live="polite">
        <p className="text-xs text-muted-foreground">
          {s.percent >= 100
            ? "Getting the voice ready… (first time only, up to a minute)"
            : `Downloading natural voice (first time only)… ${s.percent}%`}
          {s.device === "wasm" && " · this device has no GPU, so it is slower"}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${s.percent}%` }} />
        </div>
      </div>
    );
  }
  if (s.state === "error") {
    return <p className={`${className ?? ""} text-xs text-destructive`}>{s.error} Using the free browser voice.</p>;
  }
  return null;
}
