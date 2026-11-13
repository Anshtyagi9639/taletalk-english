import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** Supabase client for Client Components (runs in the browser). */
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase keys are missing. Add them to .env.local.");
  }
  return createBrowserClient(env.url, env.key);
}
