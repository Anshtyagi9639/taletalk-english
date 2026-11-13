import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Nothing here yet: an illustration, one line of text and one button. */
export function EmptyState({
  icon: Icon,
  art,
  title,
  text,
  action,
  className,
}: {
  icon: LucideIcon;
  /** A drawing from components/ui/illustrations (else the icon on soft circles). */
  art?: ReactNode;
  title: string;
  text?: ReactNode;
  /** One clear next step, e.g. <Button>Add a book</Button>. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center rounded-card border border-dashed bg-card/60 px-6 py-10 text-center", className)}>
      {art ? (
        <div className="mb-4" aria-hidden>
          {art}
        </div>
      ) : (
        <div className="relative mb-4 flex size-24 items-center justify-center" aria-hidden>
          <span className="absolute inset-0 rounded-full bg-primary-soft" />
          <span className="absolute inset-3 rounded-full bg-warm-soft" />
          <Icon className="relative size-10 text-primary" />
        </div>
      )}
      <p className="text-lg font-bold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-base text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
