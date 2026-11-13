/**
 * Reads the public Supabase settings from env vars.
 * Returns null when they are missing, so the app can show a friendly
 * "please add your keys" message instead of crashing.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}
