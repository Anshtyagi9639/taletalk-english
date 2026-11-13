"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A horizontal row that scrolls and snaps (swipe on phone, arrows on laptop),
 * with a title and an optional "See all" link — like a shelf of books.
 * Each child is one item; give items a fixed width (e.g. w-32).
 */
export function Shelf({
  title,
  seeAllHref,
  children,
  className,
}: {
  title: string;
  seeAllHref?: string;
  children: ReactNode[];
  className?: string;
}) {
  const [ref, api] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    if (!api) return;
    setCanPrev(api.canScrollPrev());
    setCanNext(api.canScrollNext());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    const first = requestAnimationFrame(update); // first check after the row has its size
    api.on("select", update).on("reInit", update).on("scroll", update);
    return () => {
      cancelAnimationFrame(first);
      api.off("select", update).off("reInit", update).off("scroll", update);
    };
  }, [api, update]);

  return (
    <section className={cn("space-y-3", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex items-center gap-1">
          {seeAllHref && (
            <Link href={seeAllHref} className="rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-primary-soft">
              See all
            </Link>
          )}
          <span className="hidden gap-1 md:flex">
            <ArrowButton label="Scroll left" disabled={!canPrev} onClick={() => api?.scrollPrev()}>
              <ChevronLeft className="size-5" />
            </ArrowButton>
            <ArrowButton label="Scroll right" disabled={!canNext} onClick={() => api?.scrollNext()}>
              <ChevronRight className="size-5" />
            </ArrowButton>
          </span>
        </div>
      </div>
      {/* Bleeds to the screen edge on phones so the next item peeks in. */}
      <div className="-mx-4 overflow-hidden px-4 sm:mx-0 sm:px-0" ref={ref}>
        <ul className="flex touch-pan-y gap-4 py-1">
          {children.map((child, i) => (
            <li key={i} className="min-w-0 shrink-0">
              {child}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ArrowButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full border bg-card text-foreground transition-opacity hover:bg-muted disabled:opacity-30"
    >
      {children}
    </button>
  );
}
