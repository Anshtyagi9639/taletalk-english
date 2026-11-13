/**
 * Natural free voice (Kokoro) in the browser. Browser only.
 *   - The model downloads on the first Listen ("Downloading voice (first time only)"),
 *     then the browser keeps it, so later it starts fast and works offline.
 *   - Uses WebGPU when the browser has it (fast), otherwise WASM (slower, smaller model).
 *   - Every made sentence is saved in this browser (IndexedDB), so it is made only once.
 */
import { getClip, putClip } from "./audio-cache";

export type VoiceStatus = {
  state: "idle" | "downloading" | "ready" | "error";
  /** 0-100 while downloading */
  percent: number;
  device: "webgpu" | "wasm" | null;
  error: string | null;
};

let status: VoiceStatus = { state: "idle", percent: 0, device: null, error: null };
const listeners = new Set<() => void>();
function setStatus(patch: Partial<VoiceStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn());
}
export const voiceStatus = {
  get: () => status,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (wav: ArrayBuffer) => void; reject: (err: Error) => void }>();
/** One sentence at a time (the model is busy otherwise). */
let queue: Promise<unknown> = Promise.resolve();

async function pickDevice(): Promise<"webgpu" | "wasm"> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (gpu && (await gpu.requestAdapter())) return "webgpu";
  } catch {
    // no WebGPU
  }
  return "wasm";
}

/** Starts (once) the background worker and the model download. */
export function loadVoiceModel(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    const device = await pickDevice();
    setStatus({ state: "downloading", percent: 0, device, error: null });
    worker = new Worker(new URL("./kokoro.worker.ts", import.meta.url), { type: "module" });
    await new Promise<void>((resolve, reject) => {
      worker!.onmessage = (e: MessageEvent) => {
        const msg = e.data as { type: string; percent?: number; id?: number; wav?: ArrayBuffer; error?: string };
        // Several files download one after another: only move the bar forward.
        if (msg.type === "progress") setStatus({ percent: Math.max(status.percent, msg.percent ?? 0) });
        else if (msg.type === "ready") {
          setStatus({ state: "ready", percent: 100 });
          resolve();
        } else if (msg.type === "audio" && msg.id) {
          pending.get(msg.id)?.resolve(msg.wav!);
          pending.delete(msg.id);
        } else if (msg.type === "error") {
          if (msg.id && pending.has(msg.id)) {
            pending.get(msg.id)!.reject(new Error(msg.error));
            pending.delete(msg.id);
          } else reject(new Error(msg.error));
        }
      };
      worker!.onerror = (e) => reject(new Error(e.message || "The voice could not start."));
      worker!.postMessage({ type: "load", device });
    });
  })().catch((err) => {
    ready = null; // allow a new try
    worker?.terminate();
    worker = null;
    setStatus({ state: "error", error: "The natural voice could not load on this device." });
    throw err;
  });
  return ready;
}

/** Audio for one sentence with a Kokoro voice (from the browser's cache when possible). */
export async function synthesize(text: string, voice: string): Promise<Blob> {
  const key = `kokoro|${voice}|${text}`;
  const cached = await getClip(key);
  if (cached) return cached;
  await loadVoiceModel();
  const run = queue.then(
    () =>
      new Promise<ArrayBuffer>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        worker!.postMessage({ type: "generate", id, text, voice, device: status.device ?? "wasm" });
      }),
  );
  queue = run.catch(() => {});
  const blob = new Blob([await run], { type: "audio/wav" });
  void putClip(key, blob);
  return blob;
}
