"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Free live speech-to-text with the browser's Web Speech API (Chrome, Edge, Safari).
 * Shows the words while I speak. Not in Firefox: then `supported` is false and the
 * caller uses recording + Groq Whisper instead.
 */

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};

const ERRORS: Record<string, string> = {
  "not-allowed": "Please allow the microphone (tap the lock icon next to the address).",
  "service-not-allowed": "Please allow the microphone (tap the lock icon next to the address).",
  "no-speech": "We did not hear anything. Please try again a bit louder.",
  network: "Live speech needs the internet. Please check your connection, or type instead.",
  "audio-capture": "We could not use your microphone. Is it connected?",
};

export function useSpeechRecognition(onDone: (finalText: string) => void) {
  const supported = useSyncExternalStore(noop, () => getCtor() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const finalRef = useRef("");
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return false;
    setError(null);
    setTranscript("");
    finalRef.current = "";
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true; // keep listening until I tap Stop
    rec.interimResults = true; // show words while I speak
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setTranscript(`${finalRef.current}${interim}`.trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") setError(ERRORS[e.error] ?? "Live speech stopped. Please try again, or type instead.");
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const text = finalRef.current.trim();
      if (text) doneRef.current(text);
    };
    recRef.current = rec;
    rec.start();
    setListening(true);
    return true;
  }, []);

  /** Stops listening; the final words are sent to `onDone`. */
  const stop = useCallback(() => recRef.current?.stop(), []);

  // Stop the microphone when leaving the page.
  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, transcript, error, start, stop };
}
