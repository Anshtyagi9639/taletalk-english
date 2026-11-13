"use client";

import { BookOpen, Check, ChevronRight, Heart, Languages, Loader2, Target, UserRound, Volume2, Waves } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { saveSettings, type SettingsInput } from "@/app/(app)/settings/actions";
import { fontClass, FONT_SIZES, LINE_HEIGHTS, READING_FONTS, useReaderSettings, type ReaderSettings } from "@/components/reader/use-reader-settings";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Group } from "./group";
import { useCanSpeak } from "@/components/voice/use-can-speak";
import { VoiceDownload } from "@/components/voice/voice-download";
import { LEVELS } from "@/lib/books/types";
import { speakText } from "@/lib/speech";
import { INTERESTS } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { synthesize } from "@/lib/tts/engine";
import { BROWSER_VOICE, KOKORO_VOICES, SPEEDS } from "@/lib/voices";

const GOALS = [10, 15, 20, 25, 30, 45, 60];

const THEMES: { id: ReaderSettings["theme"]; label: string; className: string }[] = [
  { id: "light", label: "Light", className: "bg-paper-light text-ink-light" },
  { id: "sepia", label: "Sepia", className: "bg-paper-sepia text-ink-sepia" },
  { id: "dark", label: "Dark", className: "bg-paper-dark text-ink-dark" },
];

/**
 * My settings as grouped cards (like phone settings):
 * Profile & level, Interests, Daily goal, Reading, Voice, Hindi help.
 * Reading look is saved on this device at once; the rest is saved with "Save settings".
 */
export function SettingsForm({ initial }: { initial: SettingsInput }) {
  const router = useRouter();
  const can = useCanSpeak();
  const { settings: reading, update: updateReading } = useReaderSettings();
  const [s, setS] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(initial) && state !== "saved";

  const set = <K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) => {
    setS((x) => ({ ...x, [key]: value }));
    setState("idle");
  };

  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  /** Plays a short sample with the chosen voice (downloads the natural voice the first time). */
  async function preview() {
    const sample = "Hello! I will read your stories with this voice.";
    setPreviewError(null);
    if (s.voice === BROWSER_VOICE) {
      speakText(sample, s.speed);
      return;
    }
    setPreviewing(true);
    try {
      const url = URL.createObjectURL(await synthesize(sample, s.voice));
      const audio = new Audio(url);
      audio.playbackRate = s.speed;
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (err) {
      console.error("Voice preview failed:", err);
      setPreviewError("The natural voice could not load on this device. The device voice will be used.");
    }
    setPreviewing(false);
  }

  async function onSave() {
    setState("saving");
    setError(null);
    const res = await saveSettings(s);
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      setError(res.error);
      setState("idle");
    }
  }

  const sizeIndex = FONT_SIZES.indexOf(reading.fontSize);

  return (
    <div className="space-y-5">
      <Group icon={UserRound} title="Profile & level">
        <Row label="My English level" hint="Stories and the daily story are chosen for this level.">
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <Chip key={l} selected={s.level === l} onClick={() => set("level", l)}>
                {l}
              </Chip>
            ))}
          </div>
        </Row>
        <Link href="/placement" className="flex items-center justify-between gap-3 px-4 py-3.5 text-base font-medium hover:bg-muted/60">
          Take the level test again
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </Link>
      </Group>

      <Group icon={Heart} title="Interests" hint="Your shelves and daily stories follow what you like.">
        <Row>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip
                key={i.id}
                selected={s.interests.includes(i.id)}
                onClick={() => set("interests", s.interests.includes(i.id) ? s.interests.filter((x) => x !== i.id) : [...s.interests, i.id])}
              >
                {i.label}
              </Chip>
            ))}
          </div>
        </Row>
      </Group>

      <Group icon={Target} title="Daily goal">
        <Row hint={`About ${Math.round(s.dailyGoalMinutes * 0.6)} min reading + ${s.dailyGoalMinutes - Math.round(s.dailyGoalMinutes * 0.6)} min talking.`}>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Chip key={g} selected={s.dailyGoalMinutes === g} onClick={() => set("dailyGoalMinutes", g)}>
                {g} min
              </Chip>
            ))}
          </div>
        </Row>
      </Group>

      <Group icon={BookOpen} title="Reading" hint="Saved on this device right away.">
        <Row label="Colors">
          <div className="grid grid-cols-3 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={reading.theme === t.id}
                onClick={() => updateReading({ theme: t.id })}
                className={cn(
                  "flex h-16 flex-col items-center justify-center rounded-xl text-sm font-semibold ring-1 ring-border transition",
                  t.className,
                  reading.theme === t.id && "ring-3 ring-primary",
                )}
              >
                <span className="font-reading text-lg leading-none">Aa</span>
                {t.label}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Font">
          <div className="flex flex-wrap gap-2">
            {READING_FONTS.map((f) => (
              <Chip key={f.id} selected={reading.font === f.id} onClick={() => updateReading({ font: f.id })} className={fontClass(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </Row>
        <Row label="Text size">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" aria-label="Smaller text" disabled={sizeIndex <= 0} onClick={() => updateReading({ fontSize: FONT_SIZES[Math.max(0, sizeIndex - 1)] })}>
              A-
            </Button>
            <p className={cn("flex-1 text-center", fontClass(reading.font))} style={{ fontSize: reading.fontSize, lineHeight: reading.lineHeight }}>
              The fox saw the grapes.
            </p>
            <Button
              variant="outline"
              size="icon"
              aria-label="Bigger text"
              disabled={sizeIndex >= FONT_SIZES.length - 1}
              onClick={() => updateReading({ fontSize: FONT_SIZES[Math.min(FONT_SIZES.length - 1, sizeIndex + 1)] })}
            >
              A+
            </Button>
          </div>
        </Row>
        <Row label="Line spacing">
          <div className="flex flex-wrap gap-2">
            {LINE_HEIGHTS.map((l) => (
              <Chip key={l.value} selected={reading.lineHeight === l.value} onClick={() => updateReading({ lineHeight: l.value })}>
                {l.label}
              </Chip>
            ))}
          </div>
        </Row>
      </Group>

      <Group icon={Volume2} title="Voice">
        <Row
          label="Voice for Listen"
          hint="All voices are free. Natural voices sound human; they download once (about 90–300 MB) and then work offline. The device voice works at once."
        >
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={s.voice}
              onChange={(e) => set("voice", e.target.value)}
              aria-label="Voice"
              className="h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-base"
            >
              <option value={BROWSER_VOICE}>Device voice (no download)</option>
              <optgroup label="Natural voices (free)">
                {KOKORO_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </optgroup>
            </select>
            {can && (
              <Button variant="soft" onClick={() => void preview()} disabled={previewing}>
                {previewing ? <Loader2 className="animate-spin" /> : <Volume2 />} Preview
              </Button>
            )}
          </div>
          <VoiceDownload className="mt-2" />
          {previewError && <p className="text-sm text-destructive">{previewError}</p>}
        </Row>
        <Row label="Speed">
          <div className="flex flex-wrap gap-2">
            {SPEEDS.map((sp) => (
              <Chip key={sp} selected={s.speed === sp} onClick={() => set("speed", sp)} icon={<Waves />}>
                {sp}x
              </Chip>
            ))}
          </div>
        </Row>
      </Group>

      <Group icon={Languages} title="Hindi help">
        <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4">
          <span>
            <span className="block text-base font-semibold">Also explain in Hindi</span>
            <span className="block text-sm text-muted-foreground">Short Hindi explanations for word meanings, corrections and feedback.</span>
          </span>
          <Switch checked={s.hindiHelp} onChange={(v) => set("hindiHelp", v)} label="Also explain in Hindi" />
        </label>
      </Group>

      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}
      {/* Save bar: sticks to the bottom while there are unsaved changes. */}
      <div className={cn("z-20 flex items-center gap-3", dirty && "sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] rounded-2xl bg-card/95 p-3 shadow-lift ring-1 ring-border backdrop-blur md:bottom-4")}>
        <Button size="lg" onClick={onSave} disabled={state === "saving" || (!dirty && state !== "idle")} className="flex-1 sm:flex-none">
          {state === "saving" ? <Loader2 className="animate-spin" /> : state === "saved" ? <Check /> : null}
          {state === "saved" ? "Saved" : "Save settings"}
        </Button>
        {dirty && <p className="text-sm text-muted-foreground">You have changes.</p>}
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2 px-4 py-4">
      {label && <p className="text-base font-semibold">{label}</p>}
      {children}
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** On/off switch (a real checkbox underneath, so it works with keyboard and screen readers). */
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className="relative inline-flex shrink-0">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          "flex h-8 w-14 items-center rounded-full p-1 transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
          checked ? "bg-primary" : "bg-input",
        )}
      >
        <span className={cn("size-6 rounded-full bg-white shadow-soft transition-transform", checked && "translate-x-6")} />
      </span>
    </span>
  );
}
