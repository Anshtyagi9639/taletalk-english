import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { CreateStory } from "@/components/library/create-story";
import { getProfile } from "@/lib/profile";
import { STORY_TOPICS, type StoryTopic } from "@/lib/topics";

export const metadata = { title: "Create a story" };

export default function CreateStoryPage() {
  return (
    <>
      <Link href="/library/add" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Add books
      </Link>
      <PageHeader icon={Sparkles} tone="violet"
        title="Create a story for me"
        description="An original story for your level, with 5 key words and 3 questions."
      />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <CreateStoryForm />
      </Suspense>
    </>
  );
}

/** Starts with my level and my first interest (needs my profile → inside <Suspense>). */
async function CreateStoryForm() {
  const profile = await getProfile();
  const topic = STORY_TOPICS.find((t) => profile.interests.includes(t.id))?.id as StoryTopic | undefined;
  return <CreateStory defaultLevel={profile.level} defaultTopic={topic} />;
}
