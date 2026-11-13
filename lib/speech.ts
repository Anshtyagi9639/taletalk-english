/**
 * Free browser voice (speechSynthesis). Runs in the browser only.
 * Used for "Listen" on single words and examples, so they cost nothing.
 * English by default; Hindi ("hi-IN") for the Translate tool.
 */

function voiceFor(lang: string) {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0];
  return (
    voices.find((v) => v.lang === lang && /natural|google|samantha|swara|madhur/i.test(v.name)) ??
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(base))
  );
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Reads `text` aloud. `rate` 1 = normal, 0.7 = slow. `lang` "en-US" (default) or "hi-IN". */
export function speakText(text: string, rate = 1, lang = "en-US") {
  speakSentence(text, rate, undefined, undefined, lang);
}

/**
 * Reads one sentence aloud and calls `onEnd` when it is finished (not when it was stopped).
 * Returns a function that stops it. One sentence at a time also avoids a Chrome bug
 * that cuts off long texts after ~15 seconds.
 */
export function speakSentence(text: string, rate = 1, onEnd?: () => void, onError?: () => void, lang = "en-US") {
  if (!canSpeak()) {
    onError?.();
    return () => {};
  }
  let stopped = false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = voiceFor(lang);
  if (voice) u.voice = voice;
  u.onend = () => {
    if (!stopped) onEnd?.();
  };
  u.onerror = (e) => {
    // "interrupted"/"canceled" happen when we stop it ourselves.
    if (!stopped && e.error !== "interrupted" && e.error !== "canceled") onError?.();
  };
  window.speechSynthesis.speak(u);
  return () => {
    stopped = true;
    window.speechSynthesis.cancel();
  };
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
