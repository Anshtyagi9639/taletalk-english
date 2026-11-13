"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { saveReadingProgress } from "@/app/(app)/reader/actions";

/** Reading time counts only if you did something (scroll, tap, key) in the last 90 seconds. */
const IDLE_AFTER_MS = 90_000;
const SAVE_EVERY_MS = 20_000;

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Tracks the paragraph at the top of the screen and active reading time,
 * and saves them (plus "finished") to the database.
 * Paragraphs must have a `data-p="<index>"` attribute; the end marker `data-end`.
 */
export function useReadingTracker(opts: {
  containerRef: RefObject<HTMLElement | null>;
  bookId: string;
  chapterId: string;
  chapterNumber: number;
  chapterCount: number;
  paragraphCount: number;
  resumeAt: number | null;
}) {
  const { containerRef, bookId, chapterId, chapterNumber, chapterCount, paragraphCount, resumeAt } = opts;
  const [position, setPosition] = useState(resumeAt ?? 0);

  const positionRef = useRef(resumeAt ?? 0);
  const endReachedRef = useRef(false);
  const secondsRef = useRef(0);
  const lastActivityRef = useRef(0);
  const lastSavedRef = useRef<string | null>(null);

  // Go back to where I stopped.
  useEffect(() => {
    if (!resumeAt) return;
    const el = containerRef.current?.querySelector(`[data-p="${resumeAt}"]`);
    el?.scrollIntoView({ block: "start" });
  }, [containerRef, resumeAt]);

  // Which paragraph is at the top of the screen? Did I reach the end?
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (el.dataset.end !== undefined) {
            if (e.isIntersecting) endReachedRef.current = true;
            continue;
          }
          const i = Number(el.dataset.p);
          if (e.isIntersecting) visible.add(i);
          else visible.delete(i);
        }
        if (visible.size > 0) {
          const top = Math.min(...visible);
          positionRef.current = top;
          setPosition(top);
        }
      },
      // Only the top 35% of the screen counts as "where I am reading".
      { rootMargin: "0px 0px -65% 0px" },
    );
    root.querySelectorAll("[data-p], [data-end]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef, chapterId]);

  // Count active reading seconds and save regularly.
  useEffect(() => {
    lastActivityRef.current = Date.now();
    const markActive = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const save = () => {
      const minutes = Math.floor(secondsRef.current / 60);
      const isLast = chapterNumber >= chapterCount;
      const finished = isLast && endReachedRef.current;
      const inChapter = paragraphCount > 0 ? Math.min(1, (positionRef.current + 1) / paragraphCount) : 1;
      const percent = ((chapterNumber - 1 + (endReachedRef.current ? 1 : inChapter)) / Math.max(1, chapterCount)) * 100;

      const key = `${positionRef.current}|${finished}`;
      if (minutes === 0 && key === lastSavedRef.current) return; // nothing new
      secondsRef.current -= minutes * 60;
      lastSavedRef.current = key;
      void saveReadingProgress({
        bookId,
        chapterId,
        position: positionRef.current,
        percent,
        finished,
        minutes,
        localDate: localDate(),
      });
    };

    const tick = setInterval(() => {
      const active = document.visibilityState === "visible" && Date.now() - lastActivityRef.current < IDLE_AFTER_MS;
      if (active) secondsRef.current += 1;
    }, 1000);
    const first = setTimeout(save, 3000); // marks the book as "Reading now"
    const regular = setInterval(save, SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onHide);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      clearInterval(tick);
      clearTimeout(first);
      clearInterval(regular);
      document.removeEventListener("visibilitychange", onHide);
      save(); // leaving the chapter
    };
  }, [bookId, chapterId, chapterNumber, chapterCount, paragraphCount]);

  const percentInChapter = paragraphCount > 0 ? Math.round(((position + 1) / paragraphCount) * 100) : 0;
  return { position, percentInChapter };
}
