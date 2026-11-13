import { MessageSquareQuote } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BackToPractice } from "@/components/practice/back-to-practice";
import { PhraseFinder } from "@/components/practice/phrase-finder";
import { SavedPhrases, type SavedPhrase } from "@/components/practice/saved-phrases";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Situation Phrases" };

export default function PhrasesPage() {
  return (
    <>
      <BackToPractice />
      <PageHeader icon={MessageSquareQuote} tone="amber" title="Situation Phrases" description="The right words for real situations." />
      <div className="space-y-10">
        <PhraseFinder />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">My saved phrases</h2>
          <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-muted" />}>
            <MyPhrases />
          </Suspense>
        </section>
      </div>
    </>
  );
}

/** Reads my phrases (login cookie → inside <Suspense>). */
async function MyPhrases() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_phrases")
    .select("id, situation, phrase, usage_note")
    .order("created_at", { ascending: false })
    .limit(200);
  return <SavedPhrases phrases={(data ?? []) as SavedPhrase[]} />;
}
