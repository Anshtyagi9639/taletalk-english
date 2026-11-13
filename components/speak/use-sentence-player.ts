"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { speakSentence, stopSpeaking } from "@/lib/speech";
import { synthesize } from "@/lib/tts/engine";
import { BROWSER_VOICE } from "@/lib/voices";

export type PracticeSentence = { text: string; label?: string; chapterId?: string; p?: number; s?: number };

/**
 * Plays one sentence and resolves when it has finished (Speak, Interview, Talk).
 * Natural (Kokoro) voice made in the browser for free and cached there; if it fails,
 * we switch to the device's browser voice.
 */
export function useSentencePlayer(voice: string) {
  const natural = useRef(voice !== BROWSER_VOICE);
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<string, string>());
  const [note, setNote] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    stopSpeaking();
    audio.current?.pause();
    setPlaying(false);
  }, []);

  useEffect(
    () => () => {
      stop();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [stop],
  );

  const browser = (text: string, rate: number) =>
    new Promise<void>((resolve) => {
      speakSentence(text, rate, resolve, resolve);
    });

  const play = useCallback(
    async (sentence: PracticeSentence, rate = 1) => {
      stop();
      setPlaying(true);
      try {
        if (natural.current) {
          try {
            const key = `${voice}|${sentence.text}`;
            let url = urls.current.get(key);
            if (!url) {
              url = URL.createObjectURL(await synthesize(sentence.text, voice));
              urls.current.set(key, url);
            }
            audio.current ??= new Audio();
            const a = audio.current;
            a.src = url;
            a.playbackRate = rate;
            await new Promise<void>((resolve, reject) => {
              a.onended = () => resolve();
              a.onerror = () => reject(new Error("Could not play the audio."));
              a.play().catch(reject);
            });
            return;
          } catch (err) {
            console.error("Kokoro voice failed:", err);
            natural.current = false;
            setNote("The natural voice is not available on this device. Using the device voice.");
          }
        }
        await browser(sentence.text, rate);
      } finally {
        setPlaying(false);
      }
    },
    [voice, stop],
  );

  return { play, stop, playing, note };
}
