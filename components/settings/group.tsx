import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** One settings group: a title with an icon, then rows inside one card. */
export function Group({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary-soft text-primary" aria-hidden>
          <Icon className="size-4" />
        </span>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <div className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">{children}</div>
      {hint && <p className="px-1 text-sm text-muted-foreground">{hint}</p>}
    </section>
  );
}

