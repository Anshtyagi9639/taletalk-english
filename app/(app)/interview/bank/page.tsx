import { ArrowLeft, BookMarked } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AnswerBank } from "@/components/interview/answer-bank";
import { PageHeader } from "@/components/layout/page-header";
import { getAnswerBank } from "@/lib/interview-queries";

export const metadata = { title: "Answer Bank" };

export default function AnswerBankPage() {
  return (
    <>
      <Link href="/interview" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Interview
      </Link>
      <PageHeader icon={BookMarked} tone="rose" title="Answer Bank" description="Revise your best answers. Make them your own." />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <Bank />
      </Suspense>
    </>
  );
}

async function Bank() {
  return <AnswerBank items={await getAnswerBank()} />;
}
