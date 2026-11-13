"use client";

/** Small "you did it" signals: a short vibration and (for big wins only) confetti. */

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Short vibration on phones that support it (Android). Does nothing elsewhere. */
export function vibrate(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // Some browsers block vibration; it is only a nice extra.
  }
}

/**
 * Confetti — only for big wins (finished a book, 7-day streak, level up).
 * Loaded on demand so it never slows down the first page load.
 */
export async function celebrate() {
  vibrate([20, 40, 20]);
  if (reducedMotion()) return;
  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#4f46e5", "#f59e0b", "#10b981", "#f43f5e", "#a855f7"];
  confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
  setTimeout(() => confetti({ particleCount: 50, spread: 100, origin: { y: 0.6 }, colors, disableForReducedMotion: true }), 220);
}
