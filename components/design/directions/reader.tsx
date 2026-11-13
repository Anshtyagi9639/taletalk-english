import Image from "next/image";
import { ArrowLeft, ChevronDown, Ellipsis, Highlighter, Moon, Pause, RotateCcw, RotateCw, Type, UserRound } from "lucide-react";
import { BookCover } from "@/components/library/book-cover";
import { cn } from "@/lib/utils";
import { OZ, PASSAGE } from "./mock";

/** Saved highlight colors (soft highlighter pens). */
const HL = { yellow: "bg-[#fff1a8] dark:bg-[#5c4d00]", green: "bg-[#d3f5d0] dark:bg-[#1f4a23]", blue: "bg-[#d6e9ff] dark:bg-[#1d3a5c]", pink: "bg-[#ffd9ec] dark:bg-[#5c1f3d]" };

/** Sentence 2 is playing; its word "breath" is the current word (soft moving underline). */
function Passage({ playing = 1, word = "breath", highlight = 3 }: { playing?: number; word?: string; highlight?: number }) {
  return (
    <>
      {PASSAGE.map((s, i) => (
        <p key={i} className="mb-5">
          <span className={cn("rounded-md decoration-clone px-0.5", i === playing && "bg-primary/10", i === highlight && HL.yellow)}>
            {i === playing
              ? s.split(/(\s+)/).map((w, j) => (
                  <span key={j} className={cn(w.replace(/\W/g, "") === word && "underline decoration-primary decoration-[3px] underline-offset-[6px]")}>{w}</span>
                ))
              : s}
          </span>
        </p>
      ))}
    </>
  );
}

/* ───────────────────────── Reader A · Calm focus ───────────────────────── */

/** Reader A: only the text, a thin top line with "where am I", and a floating mini player. */
export function ReaderCalm() {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-paper-light text-ink-light">
      <header className="sticky top-0 z-10 flex items-center gap-2 bg-paper-light/95 px-3 py-2">
        <button type="button" aria-label="Back to the book" className="flex size-11 items-center justify-center rounded-full"><ArrowLeft className="size-5" /></button>
        <p className="min-w-0 flex-1 truncate text-center text-sm text-ink-light/70">Chapter {OZ.chapter} · {OZ.minutesLeft} min left · page {OZ.page} of {OZ.pages}</p>
        <button type="button" aria-label="Text settings" className="flex size-11 items-center justify-center rounded-full"><Type className="size-5" /></button>
      </header>
      <div className="mx-auto h-0.5 max-w-[65ch] bg-black/5"><div className="h-full bg-primary/60" style={{ width: "30%" }} /></div>

      <article className="mx-auto max-w-[34rem] px-6 pt-8 pb-40 font-reading text-[1.1875rem] leading-[1.75] sm:max-w-[38rem] sm:text-[1.3rem]">
        <p className="mb-1 text-sm font-semibold tracking-wide text-ink-light/60 uppercase">Chapter {OZ.chapter}</p>
        <h1 className="mb-8 font-sans text-2xl font-bold tracking-tight">{OZ.chapterTitle}</h1>
        <Passage />
      </article>

      {/* Mini player */}
      <div className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] mx-auto flex max-w-xl items-center gap-3 rounded-[1.5rem] bg-[#1f2328] p-2 pr-3 text-white shadow-lift">
        <BookCover title={OZ.title} coverUrl={OZ.cover} className="w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{OZ.title}</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/20"><div className="h-full w-[38%] rounded-full bg-white" /></div>
        </div>
        <span className="text-xs text-white/70 tabular-nums">1×</span>
        <button type="button" aria-label="Pause" className="flex size-11 items-center justify-center rounded-full bg-white text-[#1f2328]"><Pause className="size-5 fill-current" /></button>
      </div>
    </div>
  );
}

/* ───────────────────────── Reader B · Warm study ───────────────────────── */

/** Reader B: warm sepia paper; on iPad landscape a "Words & highlights" panel on the right; a bigger bottom player. */
export function ReaderWarm() {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-paper-sepia text-ink-sepia">
      <header className="flex items-center gap-2 px-3 py-2">
        <button type="button" aria-label="Back to the book" className="flex size-11 items-center justify-center rounded-full bg-black/5"><ArrowLeft className="size-5" /></button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{OZ.title}</p>
          <p className="text-xs">Chapter {OZ.chapter} of {OZ.chapters} · page {OZ.page} of {OZ.pages}</p>
        </div>
        <button type="button" aria-label="Highlights" className="flex size-11 items-center justify-center rounded-full bg-black/5"><Highlighter className="size-5" /></button>
        <button type="button" aria-label="More" className="flex size-11 items-center justify-center rounded-full bg-black/5"><Ellipsis className="size-5" /></button>
      </header>

      <div className="flex min-h-0 flex-1">
        <article className="min-w-0 flex-1 overflow-y-auto px-6 pt-4 pb-10 font-reading text-[1.1875rem] leading-[1.75]">
          <div className="mx-auto max-w-[34rem]">
            <h1 className="mb-6 font-sans text-2xl font-bold">{OZ.chapterTitle}</h1>
            <Passage />
          </div>
        </article>

        {/* Side panel: only on wide screens (iPad landscape, laptop) */}
        <aside aria-label="Words and highlights" className="hidden w-80 shrink-0 space-y-4 overflow-y-auto border-l border-black/10 p-4 lg:block">
          <h2 className="text-base font-bold">Words & highlights</h2>
          <div className="rounded-card bg-white/60 p-3">
            <p className="text-base font-bold">amazement</p>
            <p className="text-sm">a feeling of great surprise</p>
          </div>
          <div className="rounded-card bg-white/60 p-3">
            <p className="text-base font-bold">dismally</p>
            <p className="text-sm">in a sad, unhappy way</p>
          </div>
          <p className={cn("rounded-lg p-3 font-reading text-sm", HL.yellow)}>“She sprang from her bed and with Toto at her heels ran and opened the door.”</p>
          <div className="flex gap-2" aria-label="Highlight colors">
            {Object.entries(HL).map(([name, cls]) => <span key={name} aria-label={name} className={cn("size-8 rounded-full ring-1 ring-black/10", cls)} />)}
          </div>
        </aside>
      </div>

      {/* Bottom player */}
      <div className="flex items-center gap-3 border-t border-black/10 bg-[#efe3c8] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{OZ.minutesLeft} min left in chapter</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full w-[38%] rounded-full bg-[#a1500a]" /></div>
        </div>
        <button type="button" aria-label="Pause" className="flex size-14 items-center justify-center rounded-full bg-warm text-warm-foreground shadow-soft"><Pause className="size-6 fill-current" /></button>
      </div>
    </div>
  );
}

/* ───────────────────────── Player A · Calm (Now Playing) ───────────────────────── */

/** Player A: blurred cover background, big cover, current sentence, scrub bar with chapter marks. */
export function PlayerCalm() {
  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-[#14171c] text-white">
      <Image src={OZ.cover} alt="" fill unoptimized className="scale-125 object-cover opacity-90 blur-3xl saturate-150" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/30 to-black/75" />
      <div className="relative mx-auto flex h-full max-w-md flex-col px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button type="button" aria-label="Close player (or swipe down)" className="mx-auto flex h-11 w-16 items-center justify-center"><ChevronDown className="size-6" /></button>
        <BookCover title={OZ.title} author={OZ.author} coverUrl={OZ.cover} className="mx-auto mt-2 w-[55%] max-w-56 shadow-lift" />
        <div className="mt-6">
          <p className="text-xl font-bold">{OZ.title}</p>
          <p className="text-sm text-white/70">Chapter {OZ.chapter} · {OZ.chapterTitle}</p>
        </div>
        <p className="mt-4 line-clamp-3 font-reading text-lg leading-relaxed text-white/90">
          As it was, the jar made her catch her <span className="rounded bg-white/20 px-1">breath</span> and wonder what had happened…
        </p>
        <div className="mt-auto">
          <Scrub />
          <div className="mt-4 flex items-center justify-between">
            <button type="button" aria-label="Back 15 seconds" className="flex size-12 items-center justify-center"><RotateCcw className="size-7" /></button>
            <button type="button" aria-label="Pause" className="flex size-[4.5rem] items-center justify-center rounded-full bg-white text-[#14171c]"><Pause className="size-8 fill-current" /></button>
            <button type="button" aria-label="Forward 15 seconds" className="flex size-12 items-center justify-center"><RotateCw className="size-7" /></button>
          </div>
          <PlayerOptions />
        </div>
      </div>
    </div>
  );
}

function Scrub({ dark = true }: { dark?: boolean }) {
  return (
    <div>
      <div className={cn("relative h-1.5 rounded-full", dark ? "bg-white/20" : "bg-black/10")} role="slider" aria-label="Position in chapter" aria-valuenow={38} tabIndex={0}>
        <div className={cn("h-full w-[38%] rounded-full", dark ? "bg-white" : "bg-warm-foreground")} />
        {[22, 61, 84].map((m) => <span key={m} className={cn("absolute top-0 h-1.5 w-0.5", dark ? "bg-black/40" : "bg-white/70")} style={{ left: `${m}%` }} aria-hidden />)}
        <span className={cn("absolute top-1/2 left-[38%] size-4 -translate-1/2 rounded-full", dark ? "bg-white" : "bg-warm-foreground")} aria-hidden />
      </div>
      <div className={cn("mt-2 flex justify-between text-xs tabular-nums", dark ? "text-white/70" : "")}>
        <span>2:31</span><span>{OZ.minutesLeft} min left</span>
      </div>
    </div>
  );
}

function PlayerOptions({ dark = true }: { dark?: boolean }) {
  const item = cn("flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold", dark ? "bg-white/10" : "bg-black/5");
  return (
    <div className="mt-5 flex justify-between">
      <button type="button" className={item}>1×</button>
      <button type="button" className={item}><Moon className="size-4" aria-hidden />Sleep</button>
      <button type="button" className={item}><UserRound className="size-4" aria-hidden />Voice</button>
      <button type="button" aria-label="Text size" className={item}><Type className="size-4" /></button>
    </div>
  );
}

/* ───────────────────────── Player B · Warm karaoke ───────────────────────── */

/** Player B: solid cover color, small cover, "karaoke" text (past dim, now big with word underline, next soft). */
export function PlayerWarm() {
  return (
    <div className="fixed inset-0 z-[60] text-white" style={{ background: `linear-gradient(170deg, ${OZ.tint}, color-mix(in oklab, ${OZ.tint} 45%, black))` }}>
      <div className="mx-auto flex h-full max-w-md flex-col px-6 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Close player (or swipe down)" className="flex size-11 items-center justify-center rounded-full bg-white/10"><ChevronDown className="size-6" /></button>
          <BookCover title={OZ.title} coverUrl={OZ.cover} className="w-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{OZ.title}</p>
            <p className="text-xs text-white/75">Chapter {OZ.chapter} · page {OZ.page} of {OZ.pages}</p>
          </div>
        </div>
        <div className="mt-8 flex-1 space-y-5 overflow-hidden font-reading leading-snug">
          <p className="text-lg text-white/40">{PASSAGE[0]}</p>
          <p className="text-[1.6rem] font-semibold">
            As it was, the jar made her catch her <span className="underline decoration-warm decoration-4 underline-offset-8">breath</span> and wonder what had happened…
          </p>
          <p className="text-lg text-white/60">{PASSAGE[2]}</p>
        </div>
        <div className="rounded-sheet bg-white/95 p-5 text-warm-foreground">
          <Scrub dark={false} />
          <div className="mt-3 flex items-center justify-between">
            <button type="button" aria-label="Back 15 seconds" className="flex size-12 items-center justify-center"><RotateCcw className="size-7" /></button>
            <button type="button" aria-label="Pause" className="flex size-[4.5rem] items-center justify-center rounded-full bg-warm shadow-soft"><Pause className="size-8 fill-current" /></button>
            <button type="button" aria-label="Forward 15 seconds" className="flex size-12 items-center justify-center"><RotateCw className="size-7" /></button>
          </div>
          <PlayerOptions dark={false} />
        </div>
      </div>
    </div>
  );
}
