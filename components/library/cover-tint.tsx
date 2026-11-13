"use client";

import { useEffect, useState, type ReactNode } from "react";
import { coverTint } from "./book-cover";

const CORS_HOSTS = ["https://covers.openlibrary.org/"];

/**
 * A soft background tinted with the cover's main color.
 * For a cover picture it measures the average color in the browser; if the picture's
 * site does not allow that (CORS), it uses the drawn-cover color for this title.
 */
export function CoverTint({ title, coverUrl, children }: { title: string; coverUrl: string | null; children: ReactNode }) {
  const fallback = coverTint(title);
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    // Only sites that allow reading their pictures (CORS); others would log errors in the console.
    if (!coverUrl || !CORS_HOSTS.some((h) => coverUrl.startsWith(h))) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 12;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 8, 12);
        const d = ctx.getImageData(0, 0, 8, 12).data;
        let r = 0;
        let g = 0;
        let b = 0;
        for (let i = 0; i < d.length; i += 4) {
          r += d[i];
          g += d[i + 1];
          b += d[i + 2];
        }
        const n = d.length / 4;
        if (!cancelled) setColor(`rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`);
      } catch {
        // The site does not allow reading the picture: keep the fallback color.
      }
    };
    img.src = coverUrl;
    return () => {
      cancelled = true;
    };
  }, [coverUrl]);

  const tint = color ?? fallback;
  return (
    <div
      className="relative -mx-4 -mt-5 overflow-hidden px-4 pt-5 pb-8 sm:-mx-6 sm:px-6 md:-mt-10 md:rounded-b-sheet md:pt-10 lg:-mx-10 lg:px-10"
      style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${tint} 28%, var(--background)) 0%, var(--background) 100%)` }}
    >
      {children}
    </div>
  );
}
