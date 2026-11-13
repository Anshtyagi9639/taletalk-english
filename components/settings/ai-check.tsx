"use client";

import { CheckCircle2, CircleAlert, FlaskConical, Loader2 } from "lucide-react";
import { useState } from "react";
import { runAiCheck, type CheckStep } from "@/app/(app)/settings/ai-check";
import { Button } from "@/components/ui/button";

/** "Test my AI setup": checks the free Gemini + Groq keys and every AI feature with tiny requests. */
export function AiCheck() {
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<CheckStep[] | null>(null);

  async function run() {
    setBusy(true);
    setSteps(null);
    try {
      setSteps(await runAiCheck());
    } catch {
      setSteps([{ id: "x", title: "AI check", usedBy: "", ok: false, detail: "The check could not run. Is the app running?", ms: 0 }]);
    }
    setBusy(false);
  }

  const allOk = steps?.every((s) => s.ok) && steps.length === 5;

  return (
    <div className="space-y-3">
      <p className="text-base text-muted-foreground">
        Tests your free Gemini and Groq keys and every AI feature (main AI, backup AI, JSON answers, images, speech-to-text). Free: it uses 5 of your daily free requests.
      </p>
      <Button onClick={run} disabled={busy} variant="secondary" className="h-11 text-base">
        {busy ? <Loader2 className="animate-spin" /> : <FlaskConical />}
        {busy ? "Testing… (about 15 seconds)" : "Test my AI setup"}
      </Button>

      {steps && (
        <ul className="space-y-2" aria-live="polite">
          {steps.map((s) => (
            <li key={s.id} className="flex gap-3 rounded-card bg-card shadow-soft ring-1 ring-border p-3">
              {s.ok ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Works" />
              ) : (
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Problem" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">
                  {s.title} {s.ms > 0 && <span className="text-xs font-normal text-muted-foreground">· {(s.ms / 1000).toFixed(1)} s</span>}
                </p>
                {s.usedBy && <p className="text-xs text-muted-foreground">Used by: {s.usedBy}</p>}
                <p className={s.ok ? "text-sm" : "text-sm text-destructive"}>{s.detail}</p>
              </div>
            </li>
          ))}
          {allOk && <li className="text-base font-semibold text-success">Everything works! 🎉</li>}
        </ul>
      )}
    </div>
  );
}
