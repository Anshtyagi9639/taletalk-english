import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GRAMMAR_CHECK, systemPrompt } from "@/lib/prompts";

/**
 * All AI calls go through this file (server only: API keys never reach the browser).
 * 100% FREE stack:
 *   - Text + images: Google Gemini free tier (GEMINI_MODEL, e.g. Flash-Lite).
 *   - Backup for text: Groq free tier (GROQ_MODEL). Used automatically when Gemini is
 *     over its free limit, busy, or not set up. (Groq's free models cannot read images.)
 *   - Speech-to-text: Groq Whisper (GROQ_STT_MODEL), free tier.
 *   - Voices are NOT here: they run free in the browser (Kokoro, see lib/tts/).
 * Every call: checks login → our own rate limit → provider → saves usage in `ai_usage`.
 *
 *   chat()          text answers (optionally JSON with a schema)
 *   checkGrammar()  corrected text + list of mistakes + score
 *   transcribe()    speech → text
 *   readImage()     photo → text / JSON (e.g. book title + author)
 *
 * Privacy: the free Gemini tier may use what we send to improve Google products,
 * so features only send English practice text — never passwords or private data.
 */

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** Our own limits per user (counted in ai_usage), below the free provider limits. */
const LIMITS = { perMinute: 20, perDay: 1500 };
const TIMEOUT_MS = 60_000;

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GROQ_URL = "https://api.groq.com/openai/v1";

/** Friendly error. `message` is safe to show to the user. */
export class AiError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AiError";
  }
}

/** An error from Gemini or Groq, with the HTTP status. */
class ProviderError extends Error {
  constructor(
    readonly provider: "gemini" | "groq",
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

const DAILY_LIMIT = "Daily free AI limit reached. Please try again later (it resets every day).";

type KeyCheck = { name: string; prefixes: string[]; url: string };
const KEYS = {
  // Google keys: old format "AIza…", new format "AQ.…".
  gemini: { name: "GEMINI_API_KEY", prefixes: ["AIza", "AQ."], url: "aistudio.google.com → Get API key" },
  groq: { name: "GROQ_API_KEY", prefixes: ["gsk_"], url: "console.groq.com → API Keys" },
} satisfies Record<string, KeyCheck>;

/** The key from .env.local, or null if it is not set. Throws on common copy-paste mistakes. */
function key(which: keyof typeof KEYS): string | null {
  const k = KEYS[which];
  const value = (process.env[k.name] ?? "").trim();
  if (!value || value.endsWith("...")) return null;
  if (/^["']|["']$/.test(value)) throw new AiError(`Remove the quotes around ${k.name} in .env.local (write it without " or ').`);
  if (/\s/.test(value)) throw new AiError(`${k.name} in .env.local has a space or line break inside. Copy it again in one piece.`);
  if (!k.prefixes.some((p) => value.startsWith(p))) {
    throw new AiError(`${k.name} does not look right (it should start with ${k.prefixes.join(" or ")}). Get a free key at ${k.url}.`);
  }
  return value;
}

const geminiModel = () => process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
const groqModel = () => process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
const groqSttModel = () => process.env.GROQ_STT_MODEL?.trim() || "whisper-large-v3-turbo";

// ---------------------------------------------------------------------------
// Login, rate limit and usage
// ---------------------------------------------------------------------------

type Ctx = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function guard(): Promise<Ctx> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) throw new AiError("Please log in again.");

  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (fromIso: string) => {
    const { count: n } = await supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", fromIso);
    return n ?? 0;
  };
  const [lastMinute, lastDay] = await Promise.all([count(since(60_000)), count(since(86_400_000))]);
  if (lastMinute >= LIMITS.perMinute) throw new AiError("You are going very fast! Please wait one minute.");
  if (lastDay >= LIMITS.perDay) throw new AiError(DAILY_LIMIT);
  return { supabase, userId };
}

type Usage = { inputTokens?: number; outputTokens?: number; audioSeconds?: number };

async function logUsage(ctx: Ctx, feature: string, model: string, u: Usage) {
  const { error } = await ctx.supabase.from("ai_usage").insert({
    user_id: ctx.userId,
    feature,
    model,
    input_tokens: u.inputTokens ?? 0,
    output_tokens: u.outputTokens ?? 0,
    audio_seconds: u.audioSeconds ?? 0,
    cost_usd: 0, // free tiers
  });
  if (error) console.error("ai_usage insert failed:", error.message); // never fail the request because of the log
}

/** Turns any error into a simple message. */
function friendly(err: unknown): AiError {
  if (err instanceof AiError) return err;
  if (err instanceof ProviderError) {
    console.error(`${err.provider} error ${err.status}:`, err.message.slice(0, 300));
    const name = err.provider === "gemini" ? "Gemini" : "Groq";
    const k = KEYS[err.provider];
    if (err.status === 429) return new AiError(DAILY_LIMIT, { cause: err });
    if (err.status === 401 || err.status === 403 || /api[_ ]?key/i.test(err.message)) {
      return new AiError(`The ${name} key is not correct. Make a new free key at ${k.url}, put it in .env.local as ${k.name}=…, then restart the app.`, { cause: err });
    }
    if (err.status === 404 || /model/i.test(err.message) && /not.*(found|exist|supported)/i.test(err.message)) {
      return new AiError(`${name} does not know this model name. Please check ${err.provider === "gemini" ? "GEMINI_MODEL" : "GROQ_MODEL"} in .env.local.`, { cause: err });
    }
    if (err.status >= 500 || err.status === 0) return new AiError("The free AI service is busy. Please try again in a minute.", { cause: err });
    return new AiError("The AI could not answer this. Please try again.", { cause: err });
  }
  console.error("AI call failed:", err);
  return new AiError("The AI could not answer. Please check your internet and try again.", { cause: err });
}

async function post(provider: "gemini" | "groq", url: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch (err) {
    throw new ProviderError(provider, 0, err instanceof Error ? err.message : "network error");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Gemini says "RESOURCE_EXHAUSTED" for an empty free quota.
    const status = /RESOURCE_EXHAUSTED|quota/i.test(body) && res.status === 400 ? 429 : res.status;
    throw new ProviderError(provider, status, body.slice(0, 1000));
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// The two providers
// ---------------------------------------------------------------------------

/** One message. `image` is a data URL ("data:image/jpeg;base64,..."). */
export type AiMessage = { role: "user" | "assistant"; content: string; image?: string };
export type JsonSchema = { name: string; schema: Record<string, unknown> };

type Request = { system: string; messages: AiMessage[]; schema?: JsonSchema; maxTokens: number };
type Answer = { text: string; model: string; inputTokens?: number; outputTokens?: number };

/**
 * How Gemini gets the JSON schema. "json" = responseJsonSchema (full JSON Schema).
 * If Gemini refuses that field, we fall back to "prompt": JSON mode + the schema in the prompt.
 */
let geminiSchemaMode: "json" | "prompt" = "json";

async function callGemini(apiKey: string, req: Request): Promise<Answer> {
  const model = geminiModel();
  const schemaInPrompt = req.schema && geminiSchemaMode === "prompt";
  const system = schemaInPrompt
    ? `${req.system}\n\nAnswer ONLY with JSON that matches this JSON Schema:\n${JSON.stringify(req.schema!.schema)}`
    : req.system;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: req.messages.map((m) => {
      const parts: Record<string, unknown>[] = [{ text: m.content }];
      const img = m.image?.match(/^data:([^;]+);base64,(.+)$/);
      if (img) parts.push({ inlineData: { mimeType: img[1], data: img[2] } });
      return { role: m.role === "assistant" ? "model" : "user", parts };
    }),
    generationConfig: {
      // Newer models may "think" before answering; leave room for that.
      maxOutputTokens: req.maxTokens * 2,
      ...(req.schema && {
        responseMimeType: "application/json",
        ...(geminiSchemaMode === "json" && { responseJsonSchema: req.schema.schema }),
      }),
    },
  };

  let data;
  try {
    data = await post("gemini", `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ProviderError && err.status === 400 && req.schema && geminiSchemaMode === "json" && /responseJsonSchema|schema/i.test(err.message)) {
      geminiSchemaMode = "prompt"; // remembered until restart
      return callGemini(apiKey, req);
    }
    throw err;
  }

  if (data.promptFeedback?.blockReason) throw new AiError("Sorry, the AI cannot help with this text.");
  const cand = data.candidates?.[0];
  const text = (cand?.content?.parts ?? [])
    .filter((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === "string")
    .map((p: { text: string }) => p.text)
    .join("")
    .trim();
  if (!text) {
    if (cand?.finishReason === "MAX_TOKENS") throw new AiError("The answer was too long. Please try a shorter text.");
    if (cand?.finishReason === "SAFETY") throw new AiError("Sorry, the AI cannot help with this text.");
    throw new ProviderError("gemini", 502, `empty answer (${cand?.finishReason ?? "no candidate"})`);
  }
  return { text, model, inputTokens: data.usageMetadata?.promptTokenCount, outputTokens: data.usageMetadata?.candidatesTokenCount };
}

async function callGroq(apiKey: string, req: Request): Promise<Answer> {
  const model = groqModel();
  const data = await post("groq", `${GROQ_URL}/chat/completions`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: req.system }, ...req.messages.map((m) => ({ role: m.role, content: m.content }))],
      max_completion_tokens: req.maxTokens * 2,
      // gpt-oss models "think" first; "low" keeps answers fast.
      ...(/gpt-oss/.test(model) && { reasoning_effort: "low" }),
      ...(req.schema && { response_format: { type: "json_schema", json_schema: { ...req.schema, strict: true } } }),
    }),
  });
  const choice = data.choices?.[0];
  const text = choice?.message?.content?.trim();
  if (!text) {
    if (choice?.finish_reason === "length") throw new AiError("The answer was too long. Please try a shorter text.");
    throw new ProviderError("groq", 502, "empty answer");
  }
  return { text, model, inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens };
}

/**
 * Gemini first; Groq if Gemini is over its free limit, busy, broken, or not set up.
 * Images need Gemini (Groq's free models cannot read images).
 */
async function complete(req: Request): Promise<Answer> {
  const groqKey = key("groq");
  const hasImage = req.messages.some((m) => m.image);
  let geminiKey: string | null;
  try {
    geminiKey = key("gemini");
  } catch (err) {
    // A broken Gemini key should not stop the app when Groq can answer.
    if (!groqKey || hasImage) throw err;
    console.warn("Gemini key problem, using Groq:", (err as Error).message);
    geminiKey = null;
  }
  if (!geminiKey && (!groqKey || hasImage)) {
    throw new AiError(
      hasImage
        ? "Reading photos needs a free Gemini key. Add GEMINI_API_KEY to .env.local (aistudio.google.com → Get API key)."
        : "AI is not set up yet. Add a free GEMINI_API_KEY (and GROQ_API_KEY as backup) to .env.local.",
    );
  }
  if (geminiKey) {
    try {
      return await callGemini(geminiKey, req);
    } catch (err) {
      if (err instanceof AiError || !groqKey || hasImage) throw err;
      console.warn("Gemini failed, trying Groq:", err instanceof ProviderError ? `${err.status} ${err.message.slice(0, 120)}` : err);
      try {
        return await callGroq(groqKey, req);
      } catch (groqErr) {
        // Both over their free limit → one clear message.
        if (err instanceof ProviderError && groqErr instanceof ProviderError && err.status === 429 && groqErr.status === 429) {
          throw new AiError(DAILY_LIMIT);
        }
        throw groqErr instanceof ProviderError && groqErr.status === 429 ? err : groqErr;
      }
    }
  }
  return callGroq(groqKey!, req);
}

/** Parses a JSON answer (also when it comes inside ```json fences). */
function parseJson<T>(text: string): T {
  const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(clean) as T;
  } catch (err) {
    throw new AiError("The AI answer was broken. Please try again.", { cause: err });
  }
}

// ---------------------------------------------------------------------------
// chat()
// ---------------------------------------------------------------------------

export type ChatOptions = {
  /** Short name saved in ai_usage, e.g. "reader.word". */
  feature: string;
  /** The task part of the system prompt (STYLE is added automatically). */
  task: string;
  /** Add Hindi help to the system prompt. */
  hindi?: boolean;
  /** One user message, or a whole conversation. */
  input: string | AiMessage[];
  /** If set, the answer is JSON that matches this schema. */
  schema?: JsonSchema;
  /** Rough upper limit for the answer length (tokens). */
  maxTokens?: number;
};

export async function chat(opts: ChatOptions & { schema?: undefined }): Promise<string>;
export async function chat<T>(opts: ChatOptions & { schema: JsonSchema }): Promise<T>;
export async function chat<T>(opts: ChatOptions): Promise<T | string> {
  const ctx = await guard();
  try {
    const answer = await complete({
      system: systemPrompt(opts.task, opts.hindi),
      messages: typeof opts.input === "string" ? [{ role: "user", content: opts.input }] : opts.input,
      schema: opts.schema,
      maxTokens: opts.maxTokens ?? 1500,
    });
    await logUsage(ctx, opts.feature, answer.model, { inputTokens: answer.inputTokens, outputTokens: answer.outputTokens });
    return opts.schema ? parseJson<T>(answer.text) : answer.text;
  } catch (err) {
    throw friendly(err);
  }
}

// ---------------------------------------------------------------------------
// checkGrammar()
// ---------------------------------------------------------------------------

export type MistakeType =
  | "tense" | "article" | "preposition" | "word choice" | "spelling" | "punctuation" | "word order" | "other";

export type GrammarResult = {
  corrected: string;
  mistakes: { wrong: string; right: string; type: MistakeType; reason: string }[];
  score: number;
};

const GRAMMAR_SCHEMA: JsonSchema = {
  name: "grammar_check",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["corrected", "mistakes", "score"],
    properties: {
      corrected: { type: "string" },
      mistakes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["wrong", "right", "type", "reason"],
          properties: {
            wrong: { type: "string" },
            right: { type: "string" },
            type: {
              type: "string",
              enum: ["tense", "article", "preposition", "word choice", "spelling", "punctuation", "word order", "other"],
            },
            reason: { type: "string" },
          },
        },
      },
      score: { type: "integer" }, // 0-10 (asked in the prompt)
    },
  },
};

export async function checkGrammar(text: string, opts: { feature?: string; hindi?: boolean } = {}) {
  return chat<GrammarResult>({
    feature: opts.feature ?? "grammar",
    task: GRAMMAR_CHECK,
    hindi: opts.hindi,
    input: text.slice(0, 6000),
    schema: GRAMMAR_SCHEMA,
    maxTokens: 3000,
  });
}

// ---------------------------------------------------------------------------
// transcribe()  (speech → text, Groq Whisper, free)
// ---------------------------------------------------------------------------

/**
 * Turns a recording into text. On purpose we do NOT send the sentence the learner
 * was trying to say: a hint would make the model "hear" the right words and hide mistakes.
 */
export async function transcribe(
  audio: Blob,
  opts: { feature: string; durationSeconds?: number; fileName?: string },
): Promise<string> {
  const ctx = await guard();
  if (audio.size > 25 * 1024 * 1024) throw new AiError("This recording is too long. Please record a shorter one.");
  try {
    const groqKey = key("groq");
    if (!groqKey) throw new AiError("Speech checking needs a free Groq key. Add GROQ_API_KEY to .env.local (console.groq.com → API Keys).");
    const model = groqSttModel();
    const form = new FormData();
    form.append("file", new Blob([await audio.arrayBuffer()], { type: audio.type || "audio/webm" }), opts.fileName ?? "speech.webm");
    form.append("model", model);
    form.append("language", "en");
    form.append("response_format", "json");
    const data = await post("groq", `${GROQ_URL}/audio/transcriptions`, { headers: { Authorization: `Bearer ${groqKey}` }, body: form });
    await logUsage(ctx, opts.feature, model, { audioSeconds: opts.durationSeconds ?? 0 });
    return String(data.text ?? "").trim();
  } catch (err) {
    throw friendly(err);
  }
}

// ---------------------------------------------------------------------------
// readImage()  (photo → text or JSON, Gemini)
// ---------------------------------------------------------------------------

type ImageOptions = {
  feature: string;
  task: string;
  /** A data URL ("data:image/jpeg;base64,..."). */
  image: string;
  question: string;
};

export async function readImage(opts: ImageOptions): Promise<string>;
export async function readImage<T>(opts: ImageOptions & { schema: JsonSchema }): Promise<T>;
export async function readImage<T>(opts: ImageOptions & { schema?: JsonSchema }): Promise<T | string> {
  const input: AiMessage[] = [{ role: "user", content: opts.question, image: opts.image }];
  return opts.schema
    ? chat<T>({ feature: opts.feature, task: opts.task, input, schema: opts.schema })
    : chat({ feature: opts.feature, task: opts.task, input });
}

/** Settings → AI check: one tiny request to ONE provider (to test each key on its own). */
export async function pingProvider(which: "gemini" | "groq"): Promise<{ model: string; answer: string }> {
  const ctx = await guard();
  try {
    const apiKey = key(which);
    if (!apiKey) {
      const k = KEYS[which];
      throw new AiError(`${k.name} is not in .env.local yet. Get a free key at ${k.url}.`);
    }
    const req: Request = { system: "Answer in one short sentence.", messages: [{ role: "user", content: "Say hello to an English learner." }], maxTokens: 200 };
    const answer = which === "gemini" ? await callGemini(apiKey, req) : await callGroq(apiKey, req);
    await logUsage(ctx, `check.${which}`, answer.model, { inputTokens: answer.inputTokens, outputTokens: answer.outputTokens });
    return { model: answer.model, answer: answer.text };
  } catch (err) {
    throw friendly(err);
  }
}

/** For server actions: run an AI task and return { ok, data } or { ok: false, error } (never throws). */
export async function aiAction<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: friendly(err).message };
  }
}
