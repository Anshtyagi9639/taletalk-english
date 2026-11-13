import { DatabaseZap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/**
 * Shows a clear message when the database tables are missing
 * (the SQL setup was not run yet), instead of a confusing error on every page.
 */
export async function SetupNotice() {
  const supabase = await createClient();
  // A normal 1-row query (a "head" query gets no error details back for a missing table).
  const { error } = await supabase.from("books").select("id").limit(1);
  const missing = error && (error.code === "PGRST205" || error.code === "42P01" || /schema cache|does not exist/i.test(error.message));
  if (!missing) return null;

  return (
    <div role="alert" className="mb-6 flex gap-3 rounded-card bg-warm-soft p-4 text-foreground">
      <DatabaseZap className="mt-0.5 size-6 shrink-0" aria-hidden />
      <div className="space-y-1 text-base">
        <p className="font-semibold">Almost ready: the database setup is not finished.</p>
        <p>
          In Supabase, open <strong>SQL Editor → New query</strong>, paste everything from{" "}
          <code className="rounded bg-card px-1">supabase/setup_all.sql</code> and press <strong>Run</strong>. Then reload
          this page.
        </p>
      </div>
    </div>
  );
}
