import { ArrowLeft, NotebookPen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MistakesNotebook } from "@/components/progress/mistakes-notebook";
import { getMistakes } from "@/lib/progress-queries";

export const metadata = { title: "Mistakes notebook" };

export default function MistakesPage() {
  return (
    <>
      <Link href="/progress" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Progress
      </Link>
      <PageHeader icon={NotebookPen} tone="amber" title="Mistakes notebook" description="Every mistake is a lesson. Practise them until they are easy." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Notebook />
      </Suspense>
    </>
  );
}

async function Notebook() {
  return <MistakesNotebook mistakes={await getMistakes()} />;
}
