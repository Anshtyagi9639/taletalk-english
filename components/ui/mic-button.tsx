"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { vibrate } from "@/lib/feedback";
import { cn } from "@/lib/utils";

/**
 * Big round microphone button. While listening it turns red, shows a stop square,
 * and a soft ring pulses around it.
 */
export function MicButton({
  listening,
  busy = false,
  disabled = false,
  onClick,
  size = "lg",
  className,
  label,
}: {
  listening: boolean;
  /** e.g. while the recording is being checked */
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: "md" | "lg";
  className?: string;
  /** Accessible name; defaults to "Start speaking" / "Stop". */
  label?: string;
}) {
  const dim = size === "lg" ? "size-20" : "size-14";
  const icon = size === "lg" ? "size-8" : "size-6";
  return (
    <span className={cn("relative inline-flex", className)}>
      {listening && (
        <>
          <span className={cn("absolute inset-0 animate-pulse-ring rounded-full bg-destructive/40", dim)} aria-hidden />
          <span className={cn("absolute inset-0 animate-pulse-ring rounded-full bg-destructive/30 [animation-delay:0.8s]", dim)} aria-hidden />
        </>
      )}
      <button
        type="button"
        onClick={() => {
          vibrate();
          onClick();
        }}
        disabled={disabled || busy}
        aria-pressed={listening}
        aria-label={label ?? (listening ? "Stop" : "Start speaking")}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full shadow-lift transition-[background-color,transform] duration-150 outline-none active:scale-[0.95] focus-visible:ring-4 focus-visible:ring-ring/50 disabled:opacity-60",
          dim,
          // Same strong red in light and dark, so the white icon always has good contrast.
          listening ? "bg-[#c8312b] text-white" : "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {busy ? <Loader2 className={cn(icon, "animate-spin")} /> : listening ? <Square className={cn(icon, "fill-current")} /> : <Mic className={icon} />}
      </button>
    </span>
  );
}
