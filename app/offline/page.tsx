import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export const metadata = { title: "Offline" };

/** Shown when there is no internet and this page was not saved before. Static: no login needed. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <Logo />
      <div className="flex size-24 items-center justify-center rounded-full bg-primary-soft" aria-hidden>
        <WifiOff className="size-10 text-primary" />
      </div>
      <div className="max-w-sm space-y-2">
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="text-base text-muted-foreground">
          This page is not saved on your phone. Chapters you opened before (or saved with “Save for offline”) still work. Connect to the
          internet to use everything.
        </p>
      </div>
      <Link href="/library" className="inline-flex h-12 items-center rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground">
        Open my library
      </Link>
    </main>
  );
}
