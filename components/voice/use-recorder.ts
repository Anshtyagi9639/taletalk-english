"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Audio formats, best first (Chrome/Android: webm; Safari/iPhone: mp4). */
const TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export type Recording = { blob: Blob; seconds: number };

/**
 * Microphone recorder. start() asks for the microphone, stop() gives the recording.
 * Stops by itself after `maxSeconds`.
 */
export function useRecorder({ maxSeconds = 90, onAutoStop }: { maxSeconds?: number; onAutoStop?: (r: Recording | null) => void } = {}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const stop = useCallback((): Promise<Recording | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      rec.stop();
    });
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Your browser cannot record sound. Please type instead.");
      return false;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      const name = (err as DOMException)?.name;
      setError(
        name === "NotAllowedError"
          ? "Please allow the microphone (tap the lock icon next to the address)."
          : "We could not use your microphone. Is it connected?",
      );
      return false;
    }
    const mimeType = TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const secs = (Date.now() - startedRef.current) / 1000;
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mimeType || "audio/webm" });
      cleanup();
      const result = blob.size > 0 && secs >= 0.5 ? { blob, seconds: secs } : null;
      if (resolveRef.current) {
        resolveRef.current(result);
        resolveRef.current = null;
      } else onAutoStop?.(result);
    };
    recorderRef.current = rec;
    startedRef.current = Date.now();
    rec.start();
    setSeconds(0);
    setRecording(true);
    timerRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedRef.current) / 1000);
      setSeconds(s);
      if (s >= maxSeconds && rec.state === "recording") rec.stop();
    }, 250);
    return true;
  }, [cleanup, maxSeconds, onAutoStop]);

  // Stop the microphone when leaving the page.
  useEffect(() => () => cleanup(), [cleanup]);

  return { recording, seconds, error, start, stop };
}

/** Sends a recording to the server and returns the words (or throws a friendly error). */
export async function transcribeRecording(rec: Recording, feature: string): Promise<string> {
  const form = new FormData();
  // The file name tells Whisper the format, so it must match what the browser recorded.
  const type = rec.blob.type;
  const ext = type.includes("webm")
    ? "webm"
    : type.includes("mp4") || type.includes("aac")
      ? "mp4"
      : type.includes("ogg")
        ? "ogg"
        : type.includes("mpeg")
          ? "mp3"
          : type.includes("wav")
            ? "wav"
            : "webm";
  form.append("audio", rec.blob, `speech.${ext}`);
  form.append("seconds", String(Math.round(rec.seconds)));
  form.append("feature", feature);
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!res.ok || !json.text) throw new Error(json.error ?? "We could not understand the recording. Please try again.");
  return json.text;
}
