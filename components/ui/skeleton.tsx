import { cn } from "@/lib/utils";

/** Gray "loading" shape with a soft shimmer. Give it a size with className. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-lg bg-[linear-gradient(90deg,var(--muted)_0%,color-mix(in_oklab,var(--muted),var(--foreground)_6%)_50%,var(--muted)_100%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

/** Loading placeholder for a row of book covers. */
export function ShelfSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden" role="status" aria-label="Loading books">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="w-32 shrink-0 space-y-2 sm:w-36">
          <Skeleton className="aspect-[2/3] w-full rounded-xl" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

/** Loading placeholder for a card with a few lines of text. */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-card bg-card p-5 shadow-soft ring-1 ring-border", className)} role="status" aria-label="Loading">
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn("h-4", i === lines - 1 ? "w-3/5" : "w-full")} />
      ))}
    </div>
  );
}

/** Loading placeholder for a list (mistakes, words, phrases). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-2" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-card bg-card p-4 ring-1 ring-border">
          <Skeleton className="size-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        </li>
      ))}
    </ul>
  );
}
