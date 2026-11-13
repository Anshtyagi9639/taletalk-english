"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Calm, rich cover colors for books without a picture (white text passes AA on all). */
const PALETTES = [
  { bg: "from-[#3730a3] to-[#1e1b4b]", line: "bg-[#c7d2fe]", tint: "#3730a3" }, // indigo
  { bg: "from-[#0f766e] to-[#134e4a]", line: "bg-[#99f6e4]", tint: "#0f766e" }, // teal
  { bg: "from-[#9a3412] to-[#431407]", line: "bg-[#fed7aa]", tint: "#9a3412" }, // rust
  { bg: "from-[#9f1239] to-[#4c0519]", line: "bg-[#fecdd3]", tint: "#9f1239" }, // wine
  { bg: "from-[#6b21a8] to-[#3b0764]", line: "bg-[#e9d5ff]", tint: "#6b21a8" }, // plum
  { bg: "from-[#166534] to-[#052e16]", line: "bg-[#bbf7d0]", tint: "#166534" }, // forest
  { bg: "from-[#334155] to-[#0f172a]", line: "bg-[#e2e8f0]", tint: "#334155" }, // slate
  { bg: "from-[#a16207] to-[#422006]", line: "bg-[#fef08a]", tint: "#a16207" }, // honey
];

/** The main color of a drawn cover (used to tint the book page). */
export function coverTint(title: string) {
  return paletteFor(title).tint;
}

function paletteFor(title: string) {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

/**
 * Book cover (2:3) with a soft shadow and a thin "spine" edge on the left.
 * Without a picture it draws a nice colored cover with the title and author.
 */
export function BookCover({
  title,
  author,
  coverUrl,
  className,
  sizes = "(min-width: 640px) 200px, 45vw",
}: {
  title: string;
  author?: string | null;
  coverUrl: string | null;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = coverUrl && !failed;
  const p = paletteFor(title);

  return (
    <div className={cn("@container relative aspect-[2/3] w-full overflow-hidden rounded-r-lg rounded-l-sm bg-muted shadow-cover", className)}>
      {showImage ? (
        <Image
          src={coverUrl}
          alt={`Cover of ${title}`}
          fill
          sizes={sizes}
          unoptimized // covers come from free sites; no need to resize them on our server
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className={cn("flex size-full flex-col bg-gradient-to-br p-[9%] pl-[13%] text-white", p.bg)} role="img" aria-label={`Cover of ${title}`}>
          <span className={cn("mb-[8%] h-0.5 w-1/3 rounded-full opacity-80", p.line)} aria-hidden />
          <span className="line-clamp-5 font-reading text-[clamp(0.7rem,11cqw,1.5rem)] leading-tight font-semibold text-balance">{title}</span>
          {author && <span className="mt-auto line-clamp-2 text-[clamp(0.6rem,7cqw,0.95rem)] font-medium opacity-85">{author}</span>}
        </div>
      )}
      {/* Spine: a darker edge + a thin light line, like a real book. */}
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[5%] bg-gradient-to-r from-black/30 to-transparent" aria-hidden />
      <span className="pointer-events-none absolute inset-y-0 left-[5%] w-px bg-white/25" aria-hidden />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-black/10 ring-inset" aria-hidden />
    </div>
  );
}
