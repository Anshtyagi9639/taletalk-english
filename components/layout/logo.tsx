import { BookHeart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TaleTalk logo: icon + name.
 * `compact` hides the name (still read by screen readers); `labelClassName` controls it per screen size.
 */
export function Logo({ compact = false, labelClassName }: { compact?: boolean; labelClassName?: string }) {
  return (
    <span className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-hero shadow-soft">
        <BookHeart className="size-5" aria-hidden />
      </span>
      <span className={cn(compact && "sr-only", labelClassName)}>TaleTalk</span>
    </span>
  );
}
