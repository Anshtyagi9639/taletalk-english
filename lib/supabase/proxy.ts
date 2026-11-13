import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

/** Pages you can open without logging in. */
const PUBLIC_PATHS = ["/login", "/auth/confirm", "/offline"];

/**
 * Runs before every page request (called from /proxy.ts):
 * 1. Refreshes the Supabase login cookie.
 * 2. Sends logged-out users to /login.
 * 3. Sends logged-in users away from /login to the home page.
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  const env = getSupabaseEnv();
  if (!env) {
    // Keys not set yet: only the login page works (it explains what to do).
    return isPublic ? NextResponse.next() : redirectTo(request, "/login");
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Stops CDNs from caching responses that carry a login cookie.
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Important: getClaims() checks the token. Do not remove this call.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  if (!loggedIn && !isPublic) return redirectTo(request, "/login");
  if (loggedIn && isPublic) return redirectTo(request, "/");

  return response;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}
