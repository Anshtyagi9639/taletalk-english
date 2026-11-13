import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Shows the logged-in email. It reads the login cookie, so always
 * wrap it in <Suspense> (required by Next.js Cache Components).
 */
export async function UserEmail() {
  const user = await getCurrentUser();
  return (
    <span className="block truncate text-sm text-muted-foreground" title={user?.email}>
      {user?.email || "Not logged in"}
    </span>
  );
}
