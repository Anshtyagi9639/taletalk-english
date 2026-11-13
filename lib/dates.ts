/**
 * Dates in MY time zone (YYYY-MM-DD). The browser saves its time zone in the "tz" cookie
 * (see components/layout/timezone-sync.tsx), so the server knows when my day starts.
 */

export const TZ_COOKIE = "tz";

export function validTimeZone(tz: string | undefined | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/** Today's date in a time zone, e.g. "2026-11-11". */
export function todayIn(tz: string, now = new Date()) {
  // "en-CA" formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "2026-11-11" + 1 → "2026-11-12". */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A stable number for a date (used to pick "of the day" items). */
export function dayNumber(date: string) {
  return Math.floor(new Date(`${date}T12:00:00Z`).getTime() / 86_400_000);
}
