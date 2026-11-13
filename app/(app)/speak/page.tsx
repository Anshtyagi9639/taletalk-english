import { Mic } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SpeakArt } from "@/components/ui/illustrations";
import { SpeakPractice } from "@/components/speak/speak-practice";
import { getProfile } from "@/lib/profile";
import { getVoicePrefs } from "@/lib/reader/queries";
import { everydayFor, TRICKY } from "@/lib/speak/sentences";

export const metadata = { title: "Speak" };

export default function SpeakPage() {
  return (
    <>
      <PageHeader icon={Mic} tone="violet" title="Speak" description="Read sentences aloud. See which words were clear." art={<SpeakArt className="w-32" />} />
      <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-muted" />}>
        <Practice />
      </Suspense>
    </>
  );
}

async function Practice() {
  const [profile, voice] = await Promise.all([getProfile(), getVoicePrefs()]);
  return <SpeakPractice everyday={everydayFor(profile.level)} tricky={TRICKY} voice={voice.voice} />;
}
