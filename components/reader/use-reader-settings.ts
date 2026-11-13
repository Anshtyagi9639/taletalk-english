"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/** Reader look: saved in this browser only (a per-device convenience). */
export type ReaderSettings = {
  fontSize: number; // px
  theme: "light" | "sepia" | "dark";
  lineHeight: number;
  font: ReadingFont;
};

/** Reading fonts (all free Google Fonts, loaded only when used). */
export const READING_FONTS = [
  { id: "literata", label: "Literata", className: "font-reading" },
  { id: "lora", label: "Lora", className: "font-lora" },
  { id: "merriweather", label: "Merriweather", className: "font-merriweather" },
  { id: "readable", label: "Easy to read", className: "font-readable" },
  { id: "sans", label: "App font", className: "font-sans" },
] as const;
export type ReadingFont = (typeof READING_FONTS)[number]["id"];

export function fontClass(font: string) {
  return READING_FONTS.find((f) => f.id === font)?.className ?? "font-reading";
}

export const FONT_SIZES = [16, 18, 20, 22, 24, 26];
export const LINE_HEIGHTS = [
  { value: 1.5, label: "Small" },
  { value: 1.7, label: "Medium" },
  { value: 2.1, label: "Large" },
];
const DEFAULTS: ReaderSettings = { fontSize: 20, theme: "light", lineHeight: 1.7, font: "literata" };
const KEY = "taletalk.reader.settings";
const EVENT = "taletalk-reader-settings";

/** Copy in memory, so settings still work when the browser blocks storage (private mode). */
let memory: string | null = null;

function read(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useReaderSettings() {
  const raw = useSyncExternalStore(subscribe, read, () => null);

  const settings = useMemo<ReaderSettings>(() => {
    if (!raw) return DEFAULTS;
    try {
      return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<ReaderSettings>) };
    } catch {
      return DEFAULTS;
    }
  }, [raw]);

  const update = useCallback(
    (patch: Partial<ReaderSettings>) => {
      memory = JSON.stringify({ ...settings, ...patch });
      try {
        localStorage.setItem(KEY, memory);
      } catch {
        // Storage blocked: the in-memory copy is used until the page reloads.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [settings],
  );

  return { settings, update };
}
