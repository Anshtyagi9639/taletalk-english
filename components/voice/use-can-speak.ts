"use client";

import { useSyncExternalStore } from "react";
import { canSpeak } from "@/lib/speech";

const noop = () => () => {};

/** true only in a browser with a voice (false on the server, so the first render matches). */
export function useCanSpeak() {
  return useSyncExternalStore(noop, canSpeak, () => false);
}
