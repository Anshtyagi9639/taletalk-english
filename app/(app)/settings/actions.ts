"use server";

import { LEVELS, type Level } from "@/lib/books/types";
import { createClient } from "@/lib/supabase/server";
import { INTERESTS } from "@/lib/topics";
import { isValidVoice, SPEEDS } from "@/lib/voices";

export type SettingsInput = {
  level: Level;
  interests: string[];
  dailyGoalMinutes: number;
  hindiHelp: boolean;
  voice: string;
  speed: number;
};

export async function saveSettings(input: SettingsInput) {
  if (!LEVELS.includes(input.level)) return { ok: false as const, error: "Please choose a level." };
  if (!Number.isInteger(input.dailyGoalMinutes) || input.dailyGoalMinutes < 5 || input.dailyGoalMinutes > 240) {
    return { ok: false as const, error: "Please choose a daily goal." };
  }
  if (!isValidVoice(input.voice) || !SPEEDS.some((s) => s === input.speed)) return { ok: false as const, error: "Please choose a voice." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return { ok: false as const, error: "Please log in again." };

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: userId,
      level: input.level,
      interests: input.interests.filter((i) => INTERESTS.some((x) => x.id === i)).slice(0, 12),
      daily_goal_minutes: input.dailyGoalMinutes,
      hindi_help: input.hindiHelp,
      voice: input.voice,
      tts_speed: input.speed,
    },
    { onConflict: "user_id" },
  );
  if (error) {
    console.error("saveSettings failed:", error.message);
    return { ok: false as const, error: "Could not save. Please try again." };
  }
  return { ok: true as const };
}
