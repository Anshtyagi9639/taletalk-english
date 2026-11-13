import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Streak counter: warm amber flame when the streak is alive, gray when it is 0. */
export function StreakFlame({ days, className, label = true }: { days: number; className?: string; label?: boolean }) {
  const alive = days > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold",
        alive ? "bg-warm-soft text-warm-text" : "bg-muted text-muted-foreground",
        className,
      )}
      aria-label={`${days} day streak`}
    >
      <Flame className={cn("size-5", alive && "fill-warm text-warm")} aria-hidden />
      <span>
        {days}
        {label && <span className="font-medium"> {days === 1 ? "day" : "days"}</span>}
      </span>
    </span>
  );
}
