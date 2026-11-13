import { ChevronRight, Info, Palette, Settings as SettingsIcon, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { UserEmail } from "@/components/layout/user-email";
import { AiCheck } from "@/components/settings/ai-check";
import { Group } from "@/components/settings/group";
import { SettingsForm } from "@/components/settings/settings-form";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getProfile } from "@/lib/profile";
import { getVoicePrefs } from "@/lib/reader/queries";
import { getToday } from "@/lib/today/queries";
import { getAiUsageThisMonth } from "@/lib/usage-queries";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader icon={SettingsIcon} tone="slate" title="Settings" description="Level, interests, goals, reading, voice and Hindi help." />
      <div className="space-y-5">
        <Suspense fallback={<CardSkeleton lines={8} />}>
          <Settings />
        </Suspense>

        <Group icon={UserRound} title="Account">
          <div className="space-y-3 px-4 py-4">
            <div>
              <p className="text-sm font-semibold">Logged in as</p>
              <Suspense fallback={<span className="text-sm text-muted-foreground">…</span>}>
                <UserEmail />
              </Suspense>
            </div>
            <SignOutButton />
          </div>
        </Group>
      </div>
    </div>
  );
}

async function Settings() {
  const [{ date }, profile, voice] = await Promise.all([getToday(), getProfile(), getVoicePrefs()]);
  const usage = await getAiUsageThisMonth(date);

  return (
    <>
      <SettingsForm
        initial={{
          level: profile.level,
          interests: profile.interests,
          dailyGoalMinutes: profile.dailyGoalMinutes,
          hindiHelp: profile.hindiHelp,
          voice: voice.voice,
          speed: voice.speed,
        }}
      />

      <Group icon={ShieldCheck} title="Data & privacy">
        <div className="space-y-3 px-4 py-4">
          <p className="text-base font-semibold">AI usage (free)</p>
          <p className="text-base">
            <span className="text-2xl font-bold tabular-nums">{usage.today}</span> requests in the last 24 hours ·{" "}
            <span className="tabular-nums">{usage.calls}</span> this month
          </p>
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (usage.today / usage.dailyLimit) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">App limit: {usage.dailyLimit} requests a day.</p>
          </div>
          {usage.groups.length > 0 && (
            <ul className="space-y-1 text-sm">
              {usage.groups.map((g) => (
                <li key={g.name} className="flex justify-between gap-2">
                  <span>{g.name}</span>
                  <span className="text-muted-foreground tabular-nums">{g.calls}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-1 px-4 py-4 text-sm text-muted-foreground">
          <p>
            Everything is free: Gemini first, Groq when Gemini&apos;s free daily limit is used up. Voices run on your device and do not count.
          </p>
          <p>
            Free Gemini may use requests to improve Google products, so <strong className="text-foreground">never type passwords or private details</strong>. Your books,
            words and progress are private to your account.
          </p>
        </div>
        <div className="space-y-3 px-4 py-4">
          <p className="text-base font-semibold">AI check</p>
          <AiCheck />
        </div>
      </Group>

      <Group icon={Info} title="About">
        <Link href="/interview" className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/60">
          <span>
            <span className="block text-base font-medium">Interview profile</span>
            <span className="block text-sm text-muted-foreground">{profile.interview.role || "Job role, experience and topics"}</span>
          </span>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
        <Link href="/design" className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-muted/60">
          <span className="flex items-center gap-2 text-base font-medium">
            <Palette className="size-4 text-muted-foreground" aria-hidden /> Design kit
          </span>
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
        <p className="px-4 py-3.5 text-sm text-muted-foreground">
          TaleTalk — learn English with stories, speaking and daily practice. Free books from Project Gutenberg and Open Library. Voices by
          Kokoro (open source).
        </p>
      </Group>
    </>
  );
}
