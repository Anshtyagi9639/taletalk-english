import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { InterviewRoom } from "@/components/interview/interview-room";
import { MODES } from "@/lib/interview";
import { getInterviewSession } from "@/lib/interview-queries";
import { getVoicePrefs } from "@/lib/reader/queries";

export const metadata = { title: "Interview" };

export default function InterviewSessionPage({ params }: PageProps<"/interview/[id]">) {
  return (
    <>
      <Link href="/interview" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Interview
      </Link>
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
        {params.then(({ id }) => (
          <Session id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function Session({ id }: { id: string }) {
  const [session, voice] = await Promise.all([getInterviewSession(id), getVoicePrefs()]);
  if (!session) notFound();
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">
        {MODES.find((m) => m.id === session.mode)?.title}
        {session.role && <span className="block text-base font-normal text-muted-foreground">{session.role}</span>}
      </h1>
      <InterviewRoom
        key={session.id}
        id={session.id}
        mode={session.mode}
        questions={session.questions}
        initialTurns={session.turns}
        initialReport={session.report}
        voice={voice.voice}
      />
    </>
  );
}
