import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary-soft text-primary",
  warm: "bg-warm-soft text-warm-text",
  success: "bg-success-soft text-success",
  muted: "bg-muted text-muted-foreground",
} as const;

/** One number with a label, e.g. "42 · minutes read". */
export function StatCard({
  icon: Icon,
  value,
  label,
  hint,
  tone = "primary",
  className,
}: {
  icon?: LucideIcon;
  value: ReactNode;
  label: string;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-card bg-card p-4 shadow-soft ring-1 ring-border", className)}>
      {Icon && (
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONES[tone])} aria-hidden>
          <Icon className="size-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className="text-xl leading-tight font-bold tabular-nums">{value}</p>
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
