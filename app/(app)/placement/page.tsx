import { GraduationCap } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PlacementQuiz } from "@/components/placement/placement-quiz";
import { getProfile } from "@/lib/profile";

export const metadata = { title: "Find my level" };

export default function PlacementPage() {
  return (
    <>
      <PageHeader icon={GraduationCap} tone="violet" title="Find my level" description="So we can choose the right stories for you." />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
        <Quiz />
      </Suspense>
    </>
  );
}

async function Quiz() {
  const profile = await getProfile();
  return <PlacementQuiz currentLevel={profile.level} currentInterests={profile.interests} />;
}
