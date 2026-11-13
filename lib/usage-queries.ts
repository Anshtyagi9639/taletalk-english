import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Our own daily AI limit (same as LIMITS.perDay in lib/ai.ts). */
const DAILY_LIMIT = 1500;

const FEATURE_GROUPS: [RegExp, string][] = [
  [/voice$|^speak\.check|^check\.stt/, "Speech-to-text"],
  [/^reader\./, "Reader help"],
  [/^talk\./, "Talk with Alex"],
  [/^practice\.|^grammar/, "Practice tools"],
  [/^interview\./, "Interview"],
  [/^story\.|^photo\./, "Stories & book photos"],
  [/^speak\./, "Speak"],
  [/^check\./, "AI check"],
];

function group(feature: string) {
  return FEATURE_GROUPS.find(([re]) => re.test(feature))?.[1] ?? "Other";
}

/** AI requests this month (my time zone) and in the last 24 hours. */
export async function getAiUsageThisMonth(today: string) {
  const supabase = await createClient();
  const monthStart = `${today.slice(0, 8)}01T00:00:00`;
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("ai_usage").select("feature").gte("created_at", monthStart).limit(20000),
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
  ]);
  const rows = (data ?? []) as { feature: string }[];
  const byGroup = new Map<string, number>();
  for (const r of rows) byGroup.set(group(r.feature), (byGroup.get(group(r.feature)) ?? 0) + 1);
  return {
    calls: rows.length,
    today: count ?? 0,
    dailyLimit: DAILY_LIMIT,
    groups: [...byGroup.entries()].map(([name, calls]) => ({ name, calls })).sort((a, b) => b.calls - a.calls),
  };
}
