"use server";

import { aiAction, chat } from "@/lib/ai";
import { isUuid } from "@/lib/books/queries";
import {
  EXPERIENCE,
  MODES,
  type AnswerFeedback,
  type InterviewMode,
  type InterviewQuestion,
  type InterviewReport,
  type InterviewTurn,
} from "@/lib/interview";
import { MISTAKE_TYPES, saveMistakes } from "@/lib/mistakes";
import { getProfile } from "@/lib/profile";
import { INTERVIEW_FEEDBACK, INTERVIEW_QUESTIONS, INTERVIEW_REPORT } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";

type Fail = { ok: false; error: string };
const clamp = (n: number) => Math.min(10, Math.max(0, Math.round(Number(n) || 0)));

async function userId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// My interview profile
// ---------------------------------------------------------------------------

export async function saveInterviewProfile(input: { role: string; topics: string[]; experience: string }) {
  const supabase = await createClient();
  const uid = await userId(supabase);
  if (!uid) return { ok: false as const, error: "Please log in again." };
  const topics = input.topics.map((t) => t.trim().slice(0, 40)).filter(Boolean).slice(0, 12);
  const experience = (EXPERIENCE as readonly string[]).includes(input.experience) ? input.experience : null;
  const { error } = await supabase.from("profiles").upsert(
    { user_id: uid, interview_role: input.role.trim().slice(0, 80) || null, interview_topics: topics, experience_level: experience },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false as const, error: "Could not save. Please try again." };
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Start → answer → end
// ---------------------------------------------------------------------------

const QUESTIONS_SCHEMA = {
  name: "interview_questions",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["question", "type", "hint"],
          properties: { question: { type: "string" }, type: { type: "string" }, hint: { type: "string" } },
        },
      },
    },
  },
};

export async function startInterview(mode: InterviewMode): Promise<{ ok: true; id: string } | Fail> {
  const info = MODES.find((m) => m.id === mode);
  if (!info) return { ok: false, error: "Please choose a type of interview." };
  const supabase = await createClient();
  if (!(await userId(supabase))) return { ok: false, error: "Please log in again." };
  const profile = await getProfile();
  const { role, topics, experience } = profile.interview;
  if (mode !== "hr" && !role) return { ok: false, error: "Please add your job role first (at the top of this page)." };

  const res = await aiAction(() =>
    chat<{ questions: InterviewQuestion[] }>({
      feature: "interview.questions",
      task: INTERVIEW_QUESTIONS,
      input: [
        `Mode: ${mode}`,
        `Number of questions: ${info.count}`,
        `Job role: ${role || "any office job"}`,
        `Experience: ${experience || "not given"}`,
        topics.length ? `Topics the learner is learning: ${topics.join(", ")}` : "",
        `Learner's English level: ${profile.level}`,
      ]
        .filter(Boolean)
        .join("\n"),
      schema: QUESTIONS_SCHEMA,
      maxTokens: 2000,
    }),
  );
  if (!res.ok) return res;
  const questions = res.data.questions
    .filter((q) => q.question?.trim())
    .slice(0, info.count)
    .map((q) => ({ question: q.question.trim(), type: q.type, hint: q.hint }));
  if (questions.length === 0) return { ok: false, error: "No questions came back. Please try again." };

  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({ mode, role: role || null, questions })
    .select("id")
    .single();
  if (error) return { ok: false, error: "Could not start the interview. Please try again." };
  return { ok: true, id: data.id };
}

const FEEDBACK_SCHEMA = {
  name: "answer_feedback",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["content", "grammar", "confidence", "better_answer"],
    properties: {
      content: {
        type: "object",
        additionalProperties: false,
        required: ["score", "comment"],
        properties: { score: { type: "integer" }, comment: { type: "string" } },
      },
      grammar: {
        type: "object",
        additionalProperties: false,
        required: ["corrected", "mistakes"],
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
                type: { type: "string", enum: [...MISTAKE_TYPES] },
                reason: { type: "string" },
              },
            },
          },
        },
      },
      confidence: {
        type: "object",
        additionalProperties: false,
        required: ["comment", "weak_phrases"],
        properties: {
          comment: { type: "string" },
          weak_phrases: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["said", "better"],
              properties: { said: { type: "string" }, better: { type: "string" } },
            },
          },
        },
      },
      better_answer: { type: "string" },
    },
  },
};

type Session = {
  id: string;
  mode: InterviewMode;
  role: string | null;
  questions: InterviewQuestion[];
  turns: InterviewTurn[];
  ended: boolean;
};

async function loadSession(id: string) {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_sessions")
    .select("id, mode, role, questions, turns, ended")
    .eq("id", id)
    .maybeSingle();
  return data ? { supabase, session: data as Session } : null;
}

/** My answer to question `index` → feedback (content, grammar, confidence, better answer). */
export async function answerQuestion(
  sessionId: string,
  index: number,
  answer: string,
  voice: boolean,
): Promise<{ ok: true; turn: InterviewTurn } | Fail> {
  const a = answer.trim().replace(/\s+/g, " ");
  if (a.split(/\s+/).length < 3) return { ok: false, error: "Please give a longer answer (at least one full sentence)." };
  if (a.length > 4000) return { ok: false, error: "That answer is very long. Please keep it under about 2 minutes." };

  const loaded = await loadSession(sessionId);
  if (!loaded) return { ok: false, error: "This interview was not found." };
  const { supabase, session } = loaded;
  const q = session.questions[index];
  if (!q || session.ended) return { ok: false, error: "This question is not available." };

  const profile = await getProfile();
  const res = await aiAction(() =>
    chat<AnswerFeedback>({
      feature: "interview.feedback",
      task: INTERVIEW_FEEDBACK,
      hindi: profile.hindiHelp,
      input: [
        `Job role: ${session.role ?? "any office job"} · Experience: ${profile.interview.experience || "not given"}`,
        `Learner's English level: ${profile.level}`,
        `Question (${q.type}): ${q.question}`,
        `Answer (${voice ? "spoken" : "typed"}): ${a}`,
      ].join("\n"),
      schema: FEEDBACK_SCHEMA,
      maxTokens: 3000,
    }),
  );
  if (!res.ok) return res;
  const feedback = res.data;
  feedback.content.score = clamp(feedback.content.score);

  const turn: InterviewTurn = { index, answer: a, voice, feedback, at: new Date().toISOString() };
  const turns = [...session.turns.filter((t) => t.index !== index), turn].sort((x, y) => x.index - y.index);
  const { error } = await supabase.from("interview_sessions").update({ turns }).eq("id", session.id);
  if (error) return { ok: false, error: "Could not save your answer. Please try again." };
  await saveMistakes(supabase, feedback.grammar.mistakes, "interview");
  return { ok: true, turn };
}

const REPORT_SCHEMA = {
  name: "interview_report",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["score", "overall", "strengths", "improve"],
    properties: {
      score: { type: "integer" },
      overall: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      improve: { type: "array", items: { type: "string" } },
    },
  },
};

/** End report: score, strengths, 3 things to improve. */
export async function endInterview(sessionId: string): Promise<{ ok: true; report: InterviewReport } | Fail> {
  const loaded = await loadSession(sessionId);
  if (!loaded) return { ok: false, error: "This interview was not found." };
  const { supabase, session } = loaded;
  if (session.turns.length === 0) return { ok: false, error: "Answer at least one question first." };

  const res = await aiAction(() =>
    chat<InterviewReport>({
      feature: "interview.report",
      task: INTERVIEW_REPORT,
      input: session.turns
        .map((t) => `Q: ${session.questions[t.index]?.question}\nA: ${t.answer}\nContent score: ${t.feedback?.content.score ?? "?"}/10`)
        .join("\n\n")
        .slice(0, 14000),
      schema: REPORT_SCHEMA,
      maxTokens: 1500,
    }),
  );
  if (!res.ok) return res;
  const report: InterviewReport = {
    score: clamp(res.data.score),
    overall: res.data.overall,
    strengths: res.data.strengths.slice(0, 3),
    improve: res.data.improve.slice(0, 3),
  };
  await supabase.from("interview_sessions").update({ report, ended: true }).eq("id", session.id);
  return { ok: true, report };
}

// ---------------------------------------------------------------------------
// Answer Bank
// ---------------------------------------------------------------------------

export async function saveToAnswerBank(input: {
  question: string;
  category: string;
  myAnswer: string;
  improved: string;
  note: string;
}) {
  const question = input.question.trim().slice(0, 500);
  const myAnswer = input.myAnswer.trim().slice(0, 4000);
  if (!question || !myAnswer) return { ok: false as const, error: "Nothing to save." };
  const supabase = await createClient();
  const { error } = await supabase.from("answer_bank").insert({
    question,
    category: input.category.slice(0, 30) || null,
    my_answer: myAnswer,
    improved_answer: input.improved.trim().slice(0, 4000) || null,
    feedback: input.note.trim().slice(0, 500) || null,
  });
  if (error) return { ok: false as const, error: "Could not save. Please try again." };
  return { ok: true as const };
}

export async function updateAnswer(id: string, improved: string) {
  if (!isUuid(id)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("answer_bank").update({ improved_answer: improved.trim().slice(0, 4000) }).eq("id", id);
  return { ok: !error };
}

export async function deleteAnswer(id: string) {
  if (!isUuid(id)) return { ok: false as const };
  const supabase = await createClient();
  const { error } = await supabase.from("answer_bank").delete().eq("id", id);
  return { ok: !error };
}
