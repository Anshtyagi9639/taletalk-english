"use client";

import { CloudDownload, Loader2, WifiOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Save for offline": loads every chapter page once and keeps it in the app's offline cache
 * (the same cache the offline helper, public/sw.js, reads when there is no internet).
 */
export function SaveOffline({ bookId, chapterNumbers }: { bookId: string; chapterNumbers: number[] }) {
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [done, setDone] = useState(0);

  async function save() {
    setState("saving");
    setDone(0);
    try {
      if (!("caches" in window)) throw new Error("no offline storage"); // needs https
      const cache = await caches.open("taletalk-pages");
      for (const n of chapterNumbers) {
        const url = `/reader/${bookId}/${n}`;
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok && !res.redirected) await cache.put(url, res);
        setDone((d) => d + 1);
      }
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-success">
        <WifiOff className="size-4" aria-hidden /> Saved — you can read it without internet.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <Button variant="ghost" onClick={() => void save()} disabled={state === "saving"}>
        {state === "saving" ? <Loader2 className="animate-spin" /> : <CloudDownload />}
        {state === "saving" ? `Saving… ${done}/${chapterNumbers.length}` : "Save for offline"}
      </Button>
      {state === "error" && <p className="text-sm text-destructive">Could not save it. Please check the internet and try again.</p>}
    </div>
  );
}
