import { ArrowLeft, Layers } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Flashcards, WordList } from "@/components/progress/flashcards";
import { getAllWords, getDueWords } from "@/lib/progress-queries";
import { getToday } from "@/lib/today/queries";

export const metadata = { title: "My words" };

export default function WordsPage() {
  return (
    <>
      <Link href="/progress" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Progress
      </Link>
      <PageHeader icon={Layers} tone="violet" title="My words" description="Review words just before you forget them: after 1, 3, 7, 14 and 30 days." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Words />
      </Suspense>
    </>
  );
}

async function Words() {
  const { date } = await getToday();
  const [due, all] = await Promise.all([getDueWords(date), getAllWords()]);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Review today ({due.length})</h2>
        <Flashcards cards={due} />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">All my words ({all.length})</h2>
        <WordList words={all} />
      </section>
    </div>
  );
}
