"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Headphones, Languages, Lightbulb, PenLine, Type, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { saveVoicePrefs, type SentenceHelp } from "@/app/(app)/reader/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { sentenceRanges } from "@/lib/text/sentences";
import { cn } from "@/lib/utils";
import { BROWSER_VOICE } from "@/lib/voices";
import { ChapterCheckCard } from "./chapter-check";
import { wordAtPoint } from "./dom";
import { HelpSheet, type Panel } from "./help-sheet";
import { ListenBar } from "./listen-bar";
import { useListen } from "./use-listen";
import { fontClass, FONT_SIZES, LINE_HEIGHTS, READING_FONTS, useReaderSettings, type ReaderSettings } from "./use-reader-settings";
import { useReadingTracker } from "./use-reading-tracker";

const THEMES: Record<ReaderSettings["theme"], { label: string; className: string; highlight: string }> = {
  light: { label: "Light", className: "bg-paper-light text-ink-light", highlight: "bg-amber-200" },
  sepia: { label: "Sepia", className: "bg-paper-sepia text-ink-sepia", highlight: "bg-amber-300/60" },
  dark: { label: "Dark", className: "bg-paper-dark text-ink-dark", highlight: "bg-amber-500/35" },
};

/** Set before going to the next chapter, so listening goes on there. */
const AUTO_LISTEN_KEY = "taletalk.autolisten";

export type ReaderViewProps = {
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterCount: number;
  chapterTitles: string[];
  paragraphs: string[];
  resumeAt: number | null;
  initialVoice: string;
  initialSpeed: number;
};

/** The reading screen: text, settings, listen, tap-a-word, select-a-sentence, chapter buttons. */
export function ReaderView(props: ReaderViewProps) {
  const { bookId, bookTitle, chapterId, chapterNumber, chapterTitle, chapterCount, chapterTitles, paragraphs, resumeAt } =
    props;
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const { settings, update } = useReaderSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [voice, setVoice] = useState(props.initialVoice);
  const [speed, setSpeed] = useState(props.initialSpeed);

  const chapterHref = useCallback((n: number) => `/reader/${bookId}/${n}`, [bookId]);

  const { position, percentInChapter } = useReadingTracker({
    containerRef: articleRef,
    bookId,
    chapterId,
    chapterNumber,
    chapterCount,
    paragraphCount: paragraphs.length,
    resumeAt,
  });

  // ----- Listen -----
  const onFinished = useCallback(() => {
    if (chapterNumber >= chapterCount) return;
    try {
      sessionStorage.setItem(AUTO_LISTEN_KEY, "1");
    } catch {
      // storage blocked: listening just stops at the chapter end
    }
    router.push(chapterHref(chapterNumber + 1));
  }, [chapterNumber, chapterCount, router, chapterHref]);
  const onFallback = useCallback(() => setVoice(BROWSER_VOICE), []);
  const listen = useListen({ paragraphs, voice, speed, onFinished, onFallback });
  const listening = listen.status !== "idle";

  // Came here from the previous chapter while listening, or from a "Continue listening"
  // button (?listen=1) → start listening.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("listen") === "1") {
      url.searchParams.delete("listen");
      window.history.replaceState(window.history.state, "", url);
      listen.player.start(listen.indexFromParagraph(resumeAt ?? 0)); // where I stopped reading
      return;
    }
    try {
      if (sessionStorage.getItem(AUTO_LISTEN_KEY)) {
        sessionStorage.removeItem(AUTO_LISTEN_KEY);
        listen.player.start(0);
      }
    } catch {
      // storage blocked
    }
  }, [listen.player]); // eslint-disable-line react-hooks/exhaustive-deps -- only when the chapter opens

  // Keep the sentence being read on the screen.
  const activeKey = listen.current ? `${listen.current.p}-${listen.current.s}` : null;
  useEffect(() => {
    if (!activeKey) return;
    const el = articleRef.current?.querySelector(`[data-s="${activeKey}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.15 || r.bottom > window.innerHeight * 0.65) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [activeKey]);

  function toggleListen() {
    if (listening) listen.player.stop();
    else listen.player.start(listen.indexFromParagraph(position));
  }

  function changeVoice(v: string) {
    setVoice(v);
    void saveVoicePrefs(v, speed);
  }
  function changeSpeed(s: number) {
    setSpeed(s);
    void saveVoicePrefs(voice, s);
  }

  // ----- Select a sentence -----
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim().replace(/\s+/g, " ") ?? "";
        const inside = sel?.anchorNode && articleRef.current?.contains(sel.anchorNode);
        setSelected(inside && text.length >= 2 && /[A-Za-z]/.test(text) ? text : null);
      }, 250);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
    };
  }, []);

  function onTextClick(e: MouseEvent<HTMLElement>) {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) return; // selecting text, not tapping a word
    const hit = articleRef.current && wordAtPoint(e.clientX, e.clientY, articleRef.current);
    if (!hit) return;
    if (listen.status === "playing" || listen.status === "loading") listen.player.pause();
    setPanel({ type: "word", ...hit });
  }

  function askAboutSelection(kind: SentenceHelp) {
    if (!selected) return;
    if (listen.status === "playing" || listen.status === "loading") listen.player.pause();
    setPanel({ type: "sentence", kind, text: selected.slice(0, 800) });
    window.getSelection()?.removeAllRanges();
    setSelected(null);
  }

  const closePanel = useCallback(() => setPanel(null), []);
  const theme = THEMES[settings.theme];

  return (
    <div className={cn("space-y-4", listening && "pb-28")}>
      {/* Top bar */}
      <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-1">
          <Link href={`/library/${bookId}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }))} aria-label="Back to the book">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{bookTitle}</p>
            <p className="truncate text-xs text-muted-foreground">
              {chapterNumber} / {chapterCount} · {percentInChapter}% of this chapter
            </p>
          </div>
          <Button
            variant={listening ? "secondary" : "default"}
            className="h-10 px-3 text-sm"
            onClick={toggleListen}
            aria-pressed={listening}
          >
            <Headphones className="size-5" /> {listening ? "Stop" : "Listen"}
          </Button>
          <Button
            variant={showSettings ? "secondary" : "ghost"}
            size="icon-lg"
            onClick={() => setShowSettings((s) => !s)}
            aria-label="Text settings"
            aria-expanded={showSettings}
          >
            <Type className="size-5" />
          </Button>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-[width]" style={{ width: `${percentInChapter}%` }} />
        </div>

        {showSettings && <SettingsPanel settings={settings} update={update} />}
      </div>

      {/* Chapter picker */}
      <select
        value={chapterNumber}
        onChange={(e) => router.push(chapterHref(Number(e.target.value)))}
        aria-label="Go to chapter"
        className="h-11 w-full rounded-lg border border-input bg-background px-3 text-base"
      >
        {chapterTitles.map((t, i) => (
          <option key={i} value={i + 1}>
            {i + 1}. {t}
          </option>
        ))}
      </select>

      {/* The story */}
      <article
        ref={articleRef}
        onClick={onTextClick}
        className={cn("rounded-2xl px-5 py-6 transition-colors sm:px-8 sm:py-8", theme.className)}
        style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight }}
      >
        <h1 className="mb-6 text-[1.3em] leading-snug font-bold">{chapterTitle}</h1>
        <div className={cn("space-y-[0.9em]", fontClass(settings.font))}>
          {paragraphs.map((p, i) => (
            <Paragraph
              key={i}
              index={i}
              text={p}
              activeSentence={listen.current?.p === i ? listen.current.s : null}
              highlight={theme.highlight}
            />
          ))}
        </div>
        <div data-end className="h-1" />
      </article>

      <p className="text-center text-sm text-muted-foreground">
        Tip: tap a word for its meaning. Select a sentence for more help.
      </p>

      <ChapterCheckCard chapterId={chapterId} />

      {/* Chapter buttons */}
      <nav className="grid grid-cols-2 gap-3" aria-label="Chapters">
        {chapterNumber > 1 ? (
          <Link href={chapterHref(chapterNumber - 1)} className={cn(buttonVariants({ variant: "outline" }), "h-12 text-base")}>
            <ChevronLeft /> Previous
          </Link>
        ) : (
          <span />
        )}
        {chapterNumber < chapterCount ? (
          <Link href={chapterHref(chapterNumber + 1)} className={cn(buttonVariants(), "h-12 text-base")}>
            Next chapter <ChevronRight />
          </Link>
        ) : (
          <Link href={`/library/${bookId}`} className={cn(buttonVariants(), "h-12 text-base")}>
            The end 🎉
          </Link>
        )}
      </nav>

      {/* Listen controls */}
      {listening && !panel && (
        <ListenBar
          status={listen.status}
          index={listen.index}
          total={listen.total}
          error={listen.error}
          voice={voice}
          speed={speed}
          onPlayPause={() =>
            listen.status === "playing" || listen.status === "loading" ? listen.player.pause() : listen.player.resume()
          }
          onPrev={() => listen.player.prev()}
          onNext={() => listen.player.next()}
          onStop={() => listen.player.stop()}
          onVoice={changeVoice}
          onSpeed={changeSpeed}
        />
      )}

      {/* Sentence help bar (when text is selected) */}
      {selected && !panel && !listening && (
        <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-2 rounded-2xl bg-popover/95 p-2 shadow-lift ring-1 ring-border backdrop-blur-xl md:bottom-6 md:rounded-2xl md:border">
          <div className="grid flex-1 grid-cols-3 gap-2">
            <Button variant="secondary" className="h-12 flex-col gap-0.5 text-xs" onClick={() => askAboutSelection("explain")}>
              <Lightbulb /> Explain simply
            </Button>
            <Button variant="secondary" className="h-12 flex-col gap-0.5 text-xs" onClick={() => askAboutSelection("hindi")}>
              <Languages /> Hindi
            </Button>
            <Button variant="secondary" className="h-12 flex-col gap-0.5 text-xs" onClick={() => askAboutSelection("grammar")}>
              <PenLine /> Grammar
            </Button>
          </div>
          <Button variant="ghost" size="icon-lg" aria-label="Cancel" onClick={() => window.getSelection()?.removeAllRanges()}>
            <X className="size-5" />
          </Button>
        </div>
      )}

      {panel && <HelpSheet panel={panel} bookId={bookId} onClose={closePanel} />}
    </div>
  );
}

/**
 * One paragraph, cut into sentences (spans) so the sentence being read can be highlighted.
 * memo: only the paragraph with the active sentence renders again.
 */
const Paragraph = memo(function Paragraph({
  index,
  text,
  activeSentence,
  highlight,
}: {
  index: number;
  text: string;
  activeSentence: number | null;
  highlight: string;
}) {
  const ranges = useMemo(() => sentenceRanges(text), [text]);
  return (
    <p data-p={index} className="whitespace-pre-line">
      {ranges.map(([a, b], s) => (
        <span
          key={s}
          data-s={`${index}-${s}`}
          className={cn("rounded-sm transition-colors", activeSentence === s && highlight)}
        >
          {text.slice(a, b)}
        </span>
      ))}
    </p>
  );
});

function SettingsPanel({ settings, update }: { settings: ReaderSettings; update: (p: Partial<ReaderSettings>) => void }) {
  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);
  return (
    <div className="mt-3 space-y-3 pb-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Text size</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 w-12 text-sm"
            disabled={sizeIndex <= 0}
            onClick={() => update({ fontSize: FONT_SIZES[Math.max(0, sizeIndex - 1)] })}
            aria-label="Smaller text"
          >
            A−
          </Button>
          <span className="w-10 text-center text-sm tabular-nums">{settings.fontSize}</span>
          <Button
            variant="outline"
            className="h-10 w-12 text-base"
            disabled={sizeIndex >= FONT_SIZES.length - 1}
            onClick={() => update({ fontSize: FONT_SIZES[Math.min(FONT_SIZES.length - 1, sizeIndex + 1)] })}
            aria-label="Bigger text"
          >
            A+
          </Button>
        </div>
      </div>
      <Choice
        label="Colors"
        options={Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }))}
        value={settings.theme}
        onChange={(id) => update({ theme: id as ReaderSettings["theme"] })}
      />
      <Choice
        label="Font"
        options={READING_FONTS.map((f) => ({ id: f.id, label: f.label }))}
        value={settings.font}
        onChange={(id) => update({ font: id as ReaderSettings["font"] })}
      />
      <Choice
        label="Line spacing"
        options={LINE_HEIGHTS.map((l) => ({ id: String(l.value), label: l.label }))}
        value={String(settings.lineHeight)}
        onChange={(id) => update({ lineHeight: Number(id) })}
      />
    </div>
  );
}

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex flex-wrap justify-end gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-10 rounded-lg border px-3 text-sm",
              label === "Font" && fontClass(o.id),
              value === o.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
