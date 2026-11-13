import { BookMarked, Briefcase, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { InterviewModes, InterviewProfileForm } from "@/components/interview/interview-home";
import { PageHeader } from "@/components/layout/page-header";
import { MODES } from "@/lib/interview";
import { getRecentInterviews } from "@/lib/interview-queries";
import { getProfile } from "@/lib/profile";

export const metadata = { title: "Interview" };

export default function InterviewPage() {
  return (
    <>
      <PageHeader icon={Briefcase} tone="rose" title="Interview practice" description="Practise answers in English. Get honest, kind feedback." />
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
        <InterviewHome />
      </Suspense>
    </>
  );
}

async function InterviewHome() {
  const [profile, recent] = await Promise.all([getProfile(), getRecentInterviews()]);
  return (
    <div className="space-y-8">
      <InterviewProfileForm initial={profile.interview} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Start an interview</h2>
        <InterviewModes />
      </section>

      <Link href="/interview/bank" className="flex items-center gap-4 rounded-xl border p-4 transition hover:bg-muted/50 bg-card">
        <BookMarked className="size-7 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Answer Bank</span>
          <span className="block text-sm text-muted-foreground">Your best answers, ready to revise before a real interview.</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">My recent interviews</h2>
          <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
            {recent.map((s) => (
              <li key={s.id}>
                <Link href={`/interview/${s.id}`} className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{MODES.find((m) => m.id === s.mode)?.title}</span>
                    <span className="block text-sm text-muted-foreground">
                      {s.turns.length} of {s.questions.length} answered{s.role ? ` · ${s.role}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {s.report ? `${s.report.score}/10` : s.ended ? "Done" : "Continue →"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
