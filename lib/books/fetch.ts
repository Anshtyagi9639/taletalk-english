import "server-only";

/** Name we send to free book APIs (no personal details). */
export const USER_AGENT = "TaleTalk/0.1 (personal English-learning app)";

/** fetch() that gives up after `ms` milliseconds. */
export async function fetchWithTimeout(url: string, ms: number, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init?.headers },
    signal: AbortSignal.timeout(ms),
    cache: "no-store",
  });
}

export { decodeEntities } from "../text/entities";

/** "Doyle, Arthur Conan" → "Arthur Conan Doyle"; "Baum, L. Frank (Lyman Frank)" → "L. Frank Baum". */
export function displayName(name: string) {
  const clean = name.replace(/\s*\([^)]*\)/g, "").replace(/,\s*\d{3,4}\??-\d{0,4}\??$/, "").trim();
  const [last, first] = clean.split(/,\s*/);
  return first ? `${first} ${last}` : clean;
}
