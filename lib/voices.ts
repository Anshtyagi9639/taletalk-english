/** Voice choices for "Listen" (used in the browser and on the server). All free. */

/** "browser" = the free voice built into the phone/computer (works at once, no download). */
export const BROWSER_VOICE = "browser";

/**
 * Natural voices from Kokoro (an open-source voice model that runs inside the browser).
 * The model downloads once (first Listen), then it works offline.
 */
export const KOKORO_VOICES = [
  { id: "af_heart", label: "Heart – US, warm", accent: "US", gender: "female" },
  { id: "af_bella", label: "Bella – US, bright", accent: "US", gender: "female" },
  { id: "am_michael", label: "Michael – US, calm", accent: "US", gender: "male" },
  { id: "am_fenrir", label: "Fenrir – US, deep", accent: "US", gender: "male" },
  { id: "bf_emma", label: "Emma – UK, clear", accent: "UK", gender: "female" },
  { id: "bm_george", label: "George – UK, classic", accent: "UK", gender: "male" },
] as const;

export const SPEEDS = [0.75, 1, 1.25] as const;

export function isKokoroVoice(voice: string) {
  return KOKORO_VOICES.some((v) => v.id === voice);
}

export function isValidVoice(voice: string) {
  return voice === BROWSER_VOICE || isKokoroVoice(voice);
}
