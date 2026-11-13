import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Create a new one for every request (never share it between users).
 */
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase keys are missing. Add them to .env.local.");
  }
  // Every Supabase call checks the login token's expiry with Date.now(). Next.js does not
  // allow reading the clock while prerendering, so always wait for the real request first.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // This is fine: proxy.ts refreshes the session cookie.
        }
      },
    },
  });
}

/** Returns the logged-in user's id and email, or null. */
export async function getCurrentUser() {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  return { id: claims.sub, email: (claims.email as string | undefined) ?? "" };
}
