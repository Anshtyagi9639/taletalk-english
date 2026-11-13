/** Interview practice: types and lists (shared by browser and server). */

export type InterviewMode = "hr" | "technical" | "mock";

export const MODES: { id: InterviewMode; title: string; text: string; count: number; emoji: string }[] = [
  { id: "hr", title: "Common HR questions", text: "Tell me about yourself, strengths, why this job…", count: 6, emoji: "🙂" },
  { id: "technical", title: "Technical questions", text: "Questions about your role and the topics you are learning.", count: 6, emoji: "💻" },
  { id: "mock", title: "Full mock interview", text: "A real interview from hello to goodbye. Feedback at the end.", count: 8, emoji: "🎤" },
];

export const EXPERIENCE = ["Fresher (no job yet)", "1-3 years", "3-5 years", "5+ years"] as const;

export type InterviewQuestion = { question: string; type: string; hint: string };

export type AnswerFeedback = {
  content: { score: number; comment: string };
  grammar: { corrected: string; mistakes: { wrong: string; right: string; type: string; reason: string }[] };
  confidence: { comment: string; weak_phrases: { said: string; better: string }[] };
  better_answer: string;
};

export type InterviewTurn = { index: number; answer: string; voice: boolean; feedback: AnswerFeedback | null; at: string };

export type InterviewReport = {
  score: number;
  overall: string;
  strengths: string[];
  improve: string[];
};

export type InterviewProfile = { role: string; topics: string[]; experience: string };
