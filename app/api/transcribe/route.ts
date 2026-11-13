import { NextResponse, type NextRequest } from "next/server";
import { aiAction, transcribe } from "@/lib/ai";

/** Audio formats Groq Whisper speech-to-text accepts. */
const EXTENSIONS = ["webm", "mp4", "m4a", "mp3", "mpeg", "mpga", "ogg", "wav", "flac"];

/** The right file extension: from the uploaded name if it is valid, else from the type. */
function audioExtension(audio: Blob) {
  const fromName = audio instanceof File ? audio.name.split(".").pop()?.toLowerCase() : undefined;
  if (fromName && EXTENSIONS.includes(fromName)) return fromName;
  const type = audio.type.toLowerCase();
  if (type.includes("webm")) return "webm";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("m4a") || type.includes("aac") || type.includes("x-m4a")) return "m4a";
  if (type.includes("mp4")) return "mp4";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("flac")) return "flac";
  return "webm";
}

/** Recordings bigger than this are refused (about 2 minutes of speech). */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * POST /api/transcribe (form-data: audio=<file>, seconds=<number>, feature=<name>)
 * → { text }. Speech-to-text gets NO hint about what I wanted to say,
 * so it does not hide my mistakes. Login and rate limits are checked inside transcribe().
 */
export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "No recording received." }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "No recording received." }, { status: 400 });
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: "This recording is too long. Please speak for less than 2 minutes." }, { status: 413 });

  const seconds = Math.min(600, Math.max(0, Number(form.get("seconds")) || 0));
  const feature = String(form.get("feature") ?? "talk.voice").replace(/[^a-z.]/g, "").slice(0, 30) || "voice";
  // Whisper reads the audio format from the file name, so it must match the real format.
  const ext = audioExtension(audio);

  const result = await aiAction(() => transcribe(audio, { feature, durationSeconds: seconds, fileName: `speech.${ext}` }));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 503 });
  if (!result.data) return NextResponse.json({ error: "We could not hear any words. Please try again a bit louder." }, { status: 422 });
  return NextResponse.json({ text: result.data });
}
