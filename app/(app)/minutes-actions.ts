"use server";

import { createClient } from "@/lib/supabase/server";

/** Features that count practice minutes (Reading saves its minutes with the reading progress). */
const FEATURES = ["talk", "practice", "speak", "interview"] as const;
export type MinuteFeature = (typeof FEATURES)[number];

/** One more active minute today for a feature (streak + Progress stats). */
export async function logMinute(feature: MinuteFeature, localDate: string) {
  if (!FEATURES.includes(feature) || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return;
  const supabase = await createClient();
  await supabase.rpc("add_practice_minutes", { p_feature: feature, p_date: localDate, p_minutes: 1 });
}
