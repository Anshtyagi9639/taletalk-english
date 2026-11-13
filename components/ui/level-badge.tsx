import { cn } from "@/lib/utils";

/** CEFR level colors: A1 green, A2 teal, B1 blue, B2 purple, C1 rose (soft background, AA text). */
const LEVELS = {
  A1: "text-level-a1 bg-level-a1/12 ring-level-a1/25",
  A2: "text-level-a2 bg-level-a2/12 ring-level-a2/25",
  B1: "text-level-b1 bg-level-b1/12 ring-level-b1/25",
  B2: "text-level-b2 bg-level-b2/12 ring-level-b2/25",
  C1: "text-level-c1 bg-level-c1/12 ring-level-c1/25",
  C2: "text-level-c1 bg-level-c1/12 ring-level-c1/25",
} as const;

export type Level = keyof typeof LEVELS;

export function isLevel(value: unknown): value is Level {
  return typeof value === "string" && value in LEVELS;
}

/** Small colored level tag, e.g. "B1". Shows nothing for an unknown level. */
export function LevelBadge({ level, className, size = "sm" }: { level: string | null | undefined; className?: string; size?: "sm" | "md" }) {
  const key = level?.toUpperCase();
  if (!isLevel(key)) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-bold tracking-wide ring-1 ring-inset",
        size === "sm" ? "h-6 px-2 text-xs" : "h-8 px-3 text-sm",
        LEVELS[key],
        className,
      )}
      title={`Level ${key}`}
    >
      {key}
    </span>
  );
}
