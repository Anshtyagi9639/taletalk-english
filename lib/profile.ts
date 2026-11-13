import "server-only";
import { LEVELS, type Level } from "@/lib/books/types";
import type { InterviewProfile } from "@/lib/interview";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  level: Level;
  interests: string[];
  dailyGoalMinutes: number;
  hindiHelp: boolean;
  placementDone: boolean;
  interview: InterviewProfile;
};

/** My learning profile (safe defaults if the row is missing). */
export async function getProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("level, interests, daily_goal_minutes, hindi_help, placement_done, interview_role, interview_topics, experience_level")
    .maybeSingle();
  return {
    level: LEVELS.includes(data?.level) ? (data!.level as Level) : "A2",
    interests: Array.isArray(data?.interests) ? data!.interests : [],
    dailyGoalMinutes: Number(data?.daily_goal_minutes) || 25,
    hindiHelp: Boolean(data?.hindi_help),
    placementDone: Boolean(data?.placement_done),
    interview: {
      role: data?.interview_role ?? "",
      topics: Array.isArray(data?.interview_topics) ? data!.interview_topics : [],
      experience: data?.experience_level ?? "",
    },
  };
}
