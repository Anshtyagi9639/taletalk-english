import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /auth/signout → log out and go back to the login page. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 303 = after a form POST, open the next page with GET.
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
