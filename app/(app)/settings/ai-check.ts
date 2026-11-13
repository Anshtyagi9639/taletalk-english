"use server";

import { AiError, chat, pingProvider, readImage, transcribe } from "@/lib/ai";

/** A 16×16 red square, to test that Gemini can see images. */
const RED_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAGUlEQVQokWO4IydHEmIY1SA3Gkp3hmvSAACaMxgQnv1u2AAAAABJRU5ErkJggg==";

export type CheckStep = {
  id: string;
  title: string;
  usedBy: string;
  ok: boolean;
  detail: string;
  ms: number;
};

async function step(id: string, title: string, usedBy: string, run: () => Promise<string>): Promise<CheckStep> {
  const t = Date.now();
  try {
    const detail = await run();
    return { id, title, usedBy, ok: true, detail, ms: Date.now() - t };
  } catch (err) {
    const detail = err instanceof AiError ? err.message : err instanceof Error ? err.message : "Unknown problem.";
    return { id, title, usedBy, ok: false, detail, ms: Date.now() - t };
  }
}

/** 1 second of quiet sound (16 kHz WAV), to test that speech-to-text accepts audio. */
function silentWav(): Blob {
  const rate = 16000;
  const samples = rate;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const text = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + samples * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, samples * 2, true);
  return new Blob([buf], { type: "audio/wav" });
}

/**
 * Tests every FREE AI service TaleTalk uses, with tiny requests.
 * Each step uses the same code as the real features (lib/ai.ts), so a ✓ means it works in the app.
 * (Natural voices run in the browser: test them in Settings → Voice.)
 */
export async function runAiCheck(): Promise<CheckStep[]> {
  const steps: CheckStep[] = [];

  steps.push(
    await step("gemini", "Gemini (main AI)", "Talk, explanations, Practice, Interview, stories", async () => {
      const r = await pingProvider("gemini");
      return `${r.model}: “${r.answer.slice(0, 70)}”`;
    }),
  );
  steps.push(
    await step("groq", "Groq (backup AI)", "Used when Gemini's free daily limit is reached", async () => {
      const r = await pingProvider("groq");
      return `${r.model}: “${r.answer.slice(0, 70)}”`;
    }),
  );
  steps.push(
    await step("json", "Structured answers (JSON)", "Word meanings, corrections, quizzes, stories, reports", async () => {
      const r = await chat<{ word: string; meaning: string }>({
        feature: "check.json",
        task: "Explain the word very simply.",
        input: "happy",
        schema: {
          name: "check",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["word", "meaning"],
            properties: { word: { type: "string" }, meaning: { type: "string" } },
          },
        },
        maxTokens: 400,
      });
      if (!r.word || !r.meaning) throw new Error("The JSON answer was empty.");
      return `“${r.word}” = ${r.meaning.slice(0, 60)}`;
    }),
  );
  steps.push(
    await step("vision", "Reading images (Gemini)", "Take a photo of a book", async () => {
      const r = await readImage<{ color: string }>({
        feature: "check.vision",
        task: "Look at the image.",
        question: "What is the main colour of this image? One word.",
        image: RED_PNG,
        schema: {
          name: "color",
          schema: { type: "object", additionalProperties: false, required: ["color"], properties: { color: { type: "string" } } },
        },
      });
      return /red/i.test(r.color) ? `It saw “${r.color}” ✓` : `It answered “${r.color}” (expected red, but images work)`;
    }),
  );
  steps.push(
    await step("stt", "Speech-to-text (Groq Whisper)", "Speak and Interview recordings (Talk uses live browser speech)", async () => {
      await transcribe(silentWav(), { feature: "check.stt", durationSeconds: 1, fileName: "check.wav" });
      return "Audio accepted ✓";
    }),
  );
  return steps;
}
