"use client";

import { useEffect } from "react";
import { logMinute, type MinuteFeature } from "@/app/(app)/minutes-actions";

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Counts active time on a page (visible + I did something in the last 2 minutes)
 * and adds one minute to today's log for `feature` every 60 active seconds.
 */
export function useActiveMinutes(feature: MinuteFeature) {
  useEffect(() => {
    let active = 0;
    let last = Date.now();
    const mark = () => (last = Date.now());
    const events = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - last < 120_000) active++;
      if (active >= 60) {
        active = 0;
        void logMinute(feature, localDate());
      }
    }, 1000);
    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [feature]);
}
