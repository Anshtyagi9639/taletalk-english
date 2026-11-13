import "server-only";
import { isUuid } from "@/lib/books/queries";
import type { InterviewMode, InterviewQuestion, InterviewReport, InterviewTurn } from "@/lib/interview";
import { createClient } from "@/lib/supabase/server";

export type InterviewSession = {
  id: string;
  mode: InterviewMode;
  role: string | null;
  questions: InterviewQuestion[];
  turns: InterviewTurn[];
  report: InterviewReport | null;
  ended: boolean;
  created_at: string;
};

export async function getInterviewSession(id: string): Promise<InterviewSession | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_sessions")
    .select("id, mode, role, questions, turns, report, ended, created_at")
    .eq("id", id)
    .maybeSingle();
  return (data as InterviewSession | null) ?? null;
}

export async function getRecentInterviews(limit = 6) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("interview_sessions")
    .select("id, mode, role, questions, turns, report, ended, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as InterviewSession[];
}

export type BankItem = {
  id: string;
  question: string;
  category: string | null;
  my_answer: string;
  improved_answer: string | null;
  feedback: string | null;
  updated_at: string;
};

export async function getAnswerBank(): Promise<BankItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("answer_bank")
    .select("id, question, category, my_answer, improved_answer, feedback, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  return (data ?? []) as BankItem[];
}
