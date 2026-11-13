"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Rounded choice chip (filters, interests, topics). `selected` shows it filled.
 * Uses aria-pressed so screen readers say "selected".
 */
export function Chip({
  selected = false,
  icon,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] duration-150 outline-none select-none active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary-soft",
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
