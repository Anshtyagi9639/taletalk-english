"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { speakSentence } from "@/lib/speech";
import { synthesize } from "@/lib/tts/engine";
import { isSpeakable, splitSentences } from "@/lib/text/sentences";
import { BROWSER_VOICE } from "@/lib/voices";

export type ListenStatus = "idle" | "loading" | "playing" | "paused";
export type ListenItem = { p: number; s: number; text: string };
type State = { status: ListenStatus; index: number; error: string | null };

/**
 * Plays a chapter sentence by sentence, with the browser voice or a natural Kokoro voice
 * (made in the browser, free, cached in IndexedDB). The next 2 sentences are made early
 * so there is no gap. If the natural voice fails, it switches to the browser voice by itself.
 */
class ListenPlayer {
  private state: State = { status: "idle", index: -1, error: null };
  private listeners = new Set<() => void>();
  /** Increases on every stop/jump, so old callbacks know they are out of date. */
  private gen = 0;
  private audio: HTMLAudioElement | null = null;
  private stopBrowser: (() => void) | null = null;
  private urls = new Map<string, Promise<string | null>>();
  private objectUrls: string[] = [];

  private voice = BROWSER_VOICE;
  private speed = 1;
  private onFinished: (() => void) | null = null;
  private onFallback: (() => void) | null = null;

  /** Called when the chapter ends, and when we switch to the free voice. */
  setCallbacks(onFinished: () => void, onFallback: () => void) {
    this.onFinished = onFinished;
    this.onFallback = onFallback;
  }

  constructor(readonly items: ListenItem[]) {}

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;

  private set(patch: Partial<State>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  /** Stops whatever is playing now. */
  private halt() {
    this.gen++;
    this.audio?.pause();
    this.stopBrowser?.();
    this.stopBrowser = null;
  }

  start(fromIndex: number) {
    this.set({ error: null });
    void this.playAt(Math.max(0, fromIndex));
  }
  pause() {
    this.halt();
    this.set({ status: "paused" });
  }
  resume() {
    void this.playAt(Math.max(0, this.state.index)); // the sentence starts again
  }
  stop() {
    this.halt();
    this.set({ status: "idle", index: -1 });
  }
  next() {
    if (this.state.index >= 0) void this.playAt(this.state.index + 1);
  }
  prev() {
    if (this.state.index >= 0) void this.playAt(Math.max(0, this.state.index - 1));
  }
  setSpeed(speed: number) {
    this.speed = speed;
    if (this.audio) this.audio.playbackRate = speed;
    // The free voice cannot change speed in the middle of a sentence: start it again.
    if (this.voice === BROWSER_VOICE && this.state.status === "playing") this.resume();
  }
  setVoice(voice: string) {
    if (voice === this.voice) return;
    this.voice = voice;
    if (this.state.status === "playing" || this.state.status === "loading") this.resume();
  }
  destroy() {
    this.halt();
    this.objectUrls.forEach((u) => URL.revokeObjectURL(u));
    this.listeners.clear();
  }

  private async playAt(i: number) {
    this.halt();
    const gen = this.gen;
    if (i >= this.items.length) {
      this.set({ status: "idle", index: -1 });
      this.onFinished?.();
      return;
    }
    const item = this.items[i];
    this.set({ index: i });

    if (this.voice === BROWSER_VOICE) {
      this.set({ status: "playing" });
      this.stopBrowser = speakSentence(
        item.text,
        this.speed,
        () => gen === this.gen && void this.playAt(i + 1),
        () => gen === this.gen && this.set({ status: "paused", error: "The free voice does not work in this browser." }),
      );
      return;
    }

    if (this.state.status !== "playing") this.set({ status: "loading" });
    try {
      const url = await this.audioUrl(i);
      this.audioUrl(i + 1).catch(() => {}); // load ahead
      this.audioUrl(i + 2).catch(() => {});
      if (gen !== this.gen) return;
      if (!url) return void this.playAt(i + 1); // nothing to read in this sentence
      this.audio ??= new Audio();
      const a = this.audio;
      a.src = url;
      a.playbackRate = this.speed;
      a.onended = () => gen === this.gen && void this.playAt(i + 1);
      await a.play();
      if (gen === this.gen) this.set({ status: "playing" });
    } catch (err) {
      if (gen !== this.gen) return;
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        // The browser wants a tap before playing sound.
        this.set({ status: "paused" });
        return;
      }
      const why = "The natural voice is not available on this device.";
      console.error("Kokoro voice failed:", err);
      this.voice = BROWSER_VOICE;
      this.set({ error: `${why} Switched to the free voice.` });
      this.onFallback?.();
      void this.playAt(i);
    }
  }

  /** Audio for sentence i as a local URL (null = skip). Made once (then cached in the browser). */
  private audioUrl(i: number): Promise<string | null> {
    if (i >= this.items.length) return Promise.resolve(null);
    const { p, s, text } = this.items[i];
    const key = `${this.voice}|${p}|${s}`;
    const known = this.urls.get(key);
    if (known) return known;

    const promise = synthesize(text, this.voice).then((blob) => {
      const url = URL.createObjectURL(blob);
      this.objectUrls.push(url);
      return url;
    });
    this.urls.set(key, promise);
    promise.catch(() => this.urls.delete(key)); // allow a new try later
    return promise;
  }
}

/** React hook around ListenPlayer. One player per chapter (the Reader remounts per chapter). */
export function useListen(opts: {
  paragraphs: string[];
  voice: string;
  speed: number;
  onFinished: () => void;
  onFallback: () => void;
}) {
  const { paragraphs, voice, speed, onFinished, onFallback } = opts;
  const items = useMemo(
    () =>
      paragraphs.flatMap((para, p) =>
        splitSentences(para)
          .map((text, s) => ({ p, s, text }))
          .filter((it) => isSpeakable(it.text)),
      ),
    [paragraphs],
  );
  const [player] = useState(() => new ListenPlayer(items));
  const state = useSyncExternalStore(player.subscribe, player.getState, player.getState);

  useEffect(() => player.setVoice(voice), [player, voice]);
  useEffect(() => player.setSpeed(speed), [player, speed]);
  useEffect(() => player.setCallbacks(onFinished, onFallback), [player, onFinished, onFallback]);
  useEffect(() => () => player.destroy(), [player]);

  const current = state.index >= 0 ? player.items[state.index] : null;
  /** First sentence at or after paragraph `p`. */
  const indexFromParagraph = (p: number) => Math.max(0, player.items.findIndex((it) => it.p >= p));

  return { ...state, current, player, indexFromParagraph, total: player.items.length };
}
