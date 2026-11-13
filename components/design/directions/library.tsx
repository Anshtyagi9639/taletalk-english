import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { BookCover } from "@/components/library/book-cover";
import { LevelBadge } from "@/components/ui/level-badge";
import { cn } from "@/lib/utils";
import { OZ, SHELF } from "./mock";

/* ───────────────────────── A · Calm grid ───────────────────────── */

/** Library A: tabs instead of 20 chips, one Continue row, then ONE clean grid (no repeated books). */
export function LibraryCalm() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[1.75rem] font-bold tracking-tight">Library</h1>
        <div className="flex gap-2">
          <button type="button" aria-label="Search my books" className="flex size-11 items-center justify-center rounded-full bg-muted"><Search className="size-5" /></button>
          <button type="button" className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-soft"><Plus className="size-4" aria-hidden />Add book</button>
        </div>
      </header>

      {/* Segmented tabs */}
      <div role="tablist" aria-label="Shelves" className="flex gap-1 rounded-2xl bg-muted p-1">
        {["Reading", "To read", "Finished", "All"].map((t, i) => (
          <button key={t} role="tab" aria-selected={i === 0} type="button" className={cn("h-10 flex-1 rounded-xl text-sm font-semibold", i === 0 ? "bg-card shadow-soft" : "text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {/* Continue: one wide row */}
      <section aria-label="Continue" className="flex items-center gap-4 rounded-card bg-card p-4 shadow-soft">
        <BookCover title={OZ.title} author={OZ.author} coverUrl={OZ.cover} className="w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{OZ.title}</p>
          <p className="text-sm text-muted-foreground">Chapter {OZ.chapter} · {OZ.minutesLeft} min left</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${OZ.percent}%` }} /></div>
        </div>
        <button type="button" className="h-11 rounded-full bg-muted px-4 text-sm font-semibold">Continue</button>
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">6 books · sorted by last opened</p>
        <button type="button" className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-primary"><SlidersHorizontal className="size-4" aria-hidden />Filter</button>
      </div>

      {/* One grid */}
      <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
        {SHELF.map((b) => (
          <li key={b.title} className="space-y-2">
            <BookCover title={b.title} author={b.author} coverUrl={null} />
            <p className="line-clamp-2 text-sm leading-snug font-semibold">{b.title}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><LevelBadge level={b.level} />{b.minutes < 60 ? `${b.minutes} min` : `${Math.round(b.minutes / 60)} h`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────────────────── B · Warm shelves ───────────────────────── */

const COLLECTIONS = [
  { name: "Short stories", count: 2, bg: "bg-primary-soft", text: "text-primary", books: [SHELF[0], SHELF[1]] },
  { name: "Classics at B1", count: 2, bg: "bg-warm-soft", text: "text-warm-text", books: [SHELF[3], SHELF[5]] },
  { name: "My uploads", count: 1, bg: "bg-success-soft", text: "text-success", books: [SHELF[2]] },
  { name: "AI stories", count: 1, bg: "bg-muted", text: "text-foreground", books: [SHELF[1]] },
];

/** Library B: big cover-tinted Continue, colorful collection tiles (instead of repeated shelves), then "For you". */
export function LibraryWarm() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <h1 className="flex-1 text-[1.75rem] font-bold tracking-tight">My books</h1>
        <button type="button" aria-label="Search my books" className="flex size-11 items-center justify-center rounded-full bg-card shadow-soft"><Search className="size-5" /></button>
      </header>

      <section
        aria-label="Continue"
        className="flex items-end gap-4 overflow-hidden rounded-sheet p-5 text-white shadow-lift"
        style={{ background: `linear-gradient(150deg, ${OZ.tint}, color-mix(in oklab, ${OZ.tint} 55%, black))` }}
      >
        <BookCover title={OZ.title} author={OZ.author} coverUrl={OZ.cover} className="w-24 shrink-0 -rotate-3" />
        <div className="min-w-0 flex-1 pb-1">
          <p className="text-sm text-white/80">Chapter {OZ.chapter} of {OZ.chapters} · {OZ.minutesLeft} min left</p>
          <p className="text-lg leading-snug font-bold">{OZ.title}</p>
          <button type="button" className="mt-3 h-11 rounded-full bg-warm px-5 text-sm font-bold text-warm-foreground">Continue reading</button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Collections</h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {COLLECTIONS.map((c) => (
            <li key={c.name} className={cn("relative h-32 overflow-hidden rounded-card p-4", c.bg)}>
              <p className={cn("text-base font-bold", c.text)}>{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.count} book{c.count === 1 ? "" : "s"}</p>
              <div className="absolute right-3 -bottom-6 flex">
                {c.books.map((b, i) => (
                  <BookCover key={i} title={b.title} author={b.author} coverUrl={null} className={cn("w-12", i === 1 && "-ml-5 rotate-6")} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">For you <span className="text-sm font-normal text-muted-foreground">· your level and interests</span></h2>
        <ul className="flex gap-4 overflow-x-auto pb-2">
          {SHELF.slice(3).map((b) => (
            <li key={b.title} className="w-28 shrink-0 space-y-2">
              <BookCover title={b.title} author={b.author} coverUrl={null} />
              <p className="line-clamp-2 text-sm leading-snug font-semibold">{b.title}</p>
            </li>
          ))}
        </ul>
      </section>

      <button type="button" aria-label="Add a book" className="fixed right-5 bottom-[calc(6rem+env(safe-area-inset-bottom))] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift md:bottom-8">
        <Plus className="size-6" />
      </button>
    </div>
  );
}
