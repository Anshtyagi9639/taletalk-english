import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { TalkSetup } from "@/components/talk/talk-setup";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getRecentConversations } from "@/lib/talk-queries";
import { getToday, talkTopicFor } from "@/lib/today/queries";

export const metadata = { title: "Talk" };

export default function TalkPage({ searchParams }: PageProps<"/talk">) {
  return (
    <>
      <PageHeader icon={MessageCircle} tone="emerald" title="Talk with Alex" description="Chat in English by typing or speaking. Alex helps you say it better." />
      <Suspense fallback={<CardSkeleton lines={4} />}>
        {searchParams.then((sp) => (
          <TalkHome topicParam={typeof sp.topic === "string" ? sp.topic : null} />
        ))}
      </Suspense>
    </>
  );
}

async function TalkHome({ topicParam }: { topicParam: string | null }) {
  const [{ date }, recent] = await Promise.all([getToday(), getRecentConversations()]);
  const dailyTopic = topicParam?.trim().slice(0, 120) || talkTopicFor(date);

  return (
    <div className="space-y-8">
      <TalkSetup dailyTopic={dailyTopic} />

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">My recent chats</h2>
          <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
            {recent.map((c) => (
              <li key={c.id}>
                <Link href={`/talk/${c.id}`} className="block space-y-0.5 px-4 py-3 transition hover:bg-muted/60">
                  <p className="flex items-center justify-between gap-2 text-base font-medium">
                    <span className="truncate">{c.title}</span>
                    <span className={c.ended ? "shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success" : "shrink-0 text-sm font-semibold text-primary"}>
                      {c.ended ? "Finished" : "Continue →"}
                    </span>
                  </p>
                  {c.summary && <p className="line-clamp-2 text-sm text-muted-foreground">{c.summary}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
