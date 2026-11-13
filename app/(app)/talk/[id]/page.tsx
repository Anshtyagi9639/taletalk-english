import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TalkRoom } from "@/components/talk/talk-room";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getVoicePrefs } from "@/lib/reader/queries";
import { getConversation } from "@/lib/talk-queries";

export const metadata = { title: "Talk" };

export default function TalkChatPage({ params }: PageProps<"/talk/[id]">) {
  return (
    <>
      <Link href="/talk" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Talk
      </Link>
      <Suspense fallback={<CardSkeleton lines={5} />}>
        {params.then(({ id }) => (
          <Chat id={id} />
        ))}
      </Suspense>
    </>
  );
}

async function Chat({ id }: { id: string }) {
  const [conv, voice] = await Promise.all([getConversation(id), getVoicePrefs()]);
  if (!conv) notFound();
  return (
    <TalkRoom
      key={conv.id}
      id={conv.id}
      title={conv.title}
      initialMessages={conv.messages}
      ended={conv.ended}
      initialSummary={conv.summary}
      voice={voice.voice}
      speed={voice.speed}
    />
  );
}
