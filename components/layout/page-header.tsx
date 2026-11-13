import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  blue: "bg-primary-soft text-primary",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  emerald: "bg-success-soft text-success",
  amber: "bg-warm-soft text-warm-text",
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  slate: "bg-muted text-muted-foreground",
} as const;

export type Tone = keyof typeof TONES;

/** A coloured square with an icon (used in headers and cards). */
export function IconTile({ icon: Icon, tone = "blue", className }: { icon: LucideIcon; tone?: Tone; className?: string }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", TONES[tone], className)} aria-hidden>
      <Icon className="size-6" />
    </span>
  );
}

/** Big, simple page title with an optional icon, one-line description and a button on the right. */
export function PageHeader({
  title,
  description,
  action,
  icon,
  tone = "blue",
  art,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  /** A small illustration on the right (hidden on phones). */
  art?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <IconTile icon={icon} tone={tone} className="mt-0.5 hidden sm:flex" />}
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-base text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {art && !action && (
        <div className="-my-4 hidden shrink-0 sm:block" aria-hidden>
          {art}
        </div>
      )}
    </header>
  );
}
