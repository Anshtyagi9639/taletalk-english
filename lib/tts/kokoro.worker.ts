/// <reference lib="webworker" />
/**
 * Runs the Kokoro voice model in a background thread, so the page never freezes.
 * Messages in:  { type: "load", device } | { type: "generate", id, text, voice, device }
 * Messages out: { type: "progress", percent } | { type: "ready", device } | { type: "audio", id, wav } | { type: "error", id?, error }
 */
import { KokoroTTS } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

type Device = "webgpu" | "wasm";
let model: Promise<KokoroTTS> | null = null;
const files = new Map<string, { loaded: number; total: number }>();

function load(device: Device) {
  model ??= KokoroTTS.from_pretrained(MODEL_ID, {
    // WebGPU is fast with full precision; WASM (no GPU) uses the smaller q8 model (~90 MB).
    dtype: device === "webgpu" ? "fp32" : "q8",
    device,
    progress_callback: (p: { status?: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== "progress" || !p.file || !p.total) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
      let loaded = 0;
      let total = 0;
      files.forEach((f) => {
        loaded += f.loaded;
        total += f.total;
      });
      self.postMessage({ type: "progress", percent: total ? Math.round((loaded / total) * 100) : 0 });
    },
  }).catch((err) => {
    model = null; // allow a new try
    throw err;
  });
  return model;
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as
    | { type: "load"; device: Device }
    | { type: "generate"; id: number; text: string; voice: string; device: Device };
  try {
    if (msg.type === "load") {
      await load(msg.device);
      self.postMessage({ type: "ready", device: msg.device });
      return;
    }
    if (msg.type === "generate") {
      const tts = await load(msg.device);
      const audio = await tts.generate(msg.text, { voice: msg.voice as never, speed: 1 });
      const wav = audio.toWav();
      self.postMessage({ type: "audio", id: msg.id, wav }, [wav]);
    }
  } catch (err) {
    self.postMessage({ type: "error", id: "id" in msg ? msg.id : undefined, error: err instanceof Error ? err.message : String(err) });
  }
};
