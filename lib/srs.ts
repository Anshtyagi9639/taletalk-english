/** Spaced repetition steps (days): 1 → 3 → 7 → 14 → 30. */
export const SRS_STEPS = [1, 3, 7, 14, 30];

/** "I knew it" moves one step up (30 stays 30); "Again" goes back to 1 day. */
export function nextInterval(current: number, knew: boolean) {
  if (!knew) return 1;
  return SRS_STEPS.find((s) => s > current) ?? 30;
}
