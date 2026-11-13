import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchClassics, type SearchMode } from "@/lib/books/gutenberg";
import { searchOpenLibrary } from "@/lib/books/openlibrary";

/**
 * GET /api/books/search?q=alice&mode=all|topic
 * Searches free classic books (Gutenberg) and book info (Open Library) at the same time.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return NextResponse.json({ error: "Please log in again." }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const mode: SearchMode = request.nextUrl.searchParams.get("mode") === "topic" ? "topic" : "all";
  if (q.length < 2) return NextResponse.json({ error: "Please type at least 2 letters." }, { status: 400 });

  const [classics, openLibrary] = await Promise.allSettled([searchClassics(q, mode), searchOpenLibrary(q)]);

  if (classics.status === "rejected" && openLibrary.status === "rejected") {
    console.error("Book search failed:", classics.reason, openLibrary.reason);
    return NextResponse.json(
      { error: "The book services are not answering. Please try again in a minute." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    classics: classics.status === "fulfilled" ? classics.value.results : [],
    via: classics.status === "fulfilled" ? classics.value.via : null,
    openLibrary: openLibrary.status === "fulfilled" ? openLibrary.value : [],
  });
}
