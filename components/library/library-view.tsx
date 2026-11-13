"use client";

import { LayoutGrid, Loader2, Rows3, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { searchInsideBooks } from "@/app/(app)/library/actions";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ShelfArt } from "@/components/ui/illustrations";
import { Shelf } from "@/components/ui/shelf";
import { lengthGroup, readingMinutes } from "@/lib/books/levels";
import { LEVELS, type BookSource, type Level, type LibraryBook, type ReadingStatus } from "@/lib/books/types";
import { cn } from "@/lib/utils";
import { BookCard } from "./book-card";

type Tab = "all" | ReadingStatus;
type View = "shelves" | "grid";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reading", label: "Reading now" },
  { id: "want", label: "Want to read" },
  { id: "finished", label: "Finished" },
];

const LENGTHS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
] as const;

const SOURCES: { id: BookSource; label: string }[] = [
  { id: "gutenberg", label: "Classic" },
  { id: "upload", label: "My upload" },
  { id: "ai", label: "AI story" },
];

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const VIEW_KEY = "taletalk.library.view";
const VIEW_EVENT = "taletalk-library-view";
let viewMemory: View = "shelves";

/** Shelves or grid: remembered in this browser only (a per-device convenience). */
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "shelves";
  } catch {
    return viewMemory;
  }
}
function subscribeView(cb: () => void) {
  window.addEventListener(VIEW_EVENT, cb);
  return () => window.removeEventListener(VIEW_EVENT, cb);
}
function setView(v: View) {
  viewMemory = v;
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    // storage blocked: kept in memory until the page reloads
  }
  window.dispatchEvent(new Event(VIEW_EVENT));
}

/**
 * Library: sticky search + filter chips; shelves (For you, Continue, Short stories, …)
 * or a grid of all books. Searching or filtering always shows the grid.
 */
export function LibraryView({ books, level, likedGenres }: { books: LibraryBook[]; level: Level; likedGenres: string[] }) {
  const view = useSyncExternalStore(subscribeView, readView, () => "shelves" as View);
  const [tab, setTab] = useState<Tab>("all");
  const [levelF, setLevelF] = useState("");
  const [length, setLength] = useState("");
  const [genre, setGenre] = useState("");
  const [source, setSource] = useState("");
  const [query, setQuery] = useState("");
  // Results of "word in the text" search, remembered with the words they belong to.
  const [textHits, setTextHits] = useState<{ q: string; ids: string[] } | null>(null);


  const q = query.trim();
  const searchingText = q.length >= 3 && textHits?.q !== q;

  // Search inside the book text 0.4 s after you stop typing.
  useEffect(() => {
    if (q.length < 3) return;
    const timer = setTimeout(async () => {
      const ids = await searchInsideBooks(q);
      setTextHits({ q, ids });
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  const genres = useMemo(() => [...new Set(books.map((b) => b.genre).filter((g): g is string => Boolean(g)))].sort(), [books]);
  const textIds = useMemo(() => new Set(textHits?.q === q ? textHits.ids : []), [textHits, q]);

  const filtersOn = Boolean(levelF || length || genre || source || q);
  const showGrid = view === "grid" || filtersOn;

  const visible = books.filter((b) => {
    if (showGrid && tab !== "all" && b.status !== tab) return false;
    if (levelF && b.level !== levelF) return false;
    if (length && lengthGroup(b.word_count) !== length) return false;
    if (genre && b.genre !== genre) return false;
    if (source && b.source !== source) return false;
    if (q) {
      const needle = q.toLowerCase();
      const inInfo = b.title.toLowerCase().includes(needle) || (b.author ?? "").toLowerCase().includes(needle);
      if (!inInfo && !textIds.has(b.id)) return false;
    }
    return true;
  });

  const shelves = useMemo(() => makeShelves(books, level, likedGenres), [books, level, likedGenres]);

  const clearAll = () => {
    setLevelF("");
    setLength("");
    setGenre("");
    setSource("");
    setQuery("");
  };
  const toggle = (value: string, current: string, set: (v: string) => void) => set(current === value ? "" : value);

  return (
    <div className="space-y-6">
      {/* Sticky search + filter chips */}
      <div className="sticky top-0 z-20 -mx-4 space-y-3 border-b bg-background/90 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Title, author, or a word in the text"
              aria-label="Search my library"
              className="h-12 w-full rounded-xl border border-input bg-card pr-10 pl-11 text-base shadow-soft outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {searchingText && <Loader2 className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex rounded-card bg-card shadow-soft ring-1 ring-border p-1 shadow-soft" role="group" aria-label="View">
            {(
              [
                ["shelves", Rows3, "Shelves"],
                ["grid", LayoutGrid, "Grid"],
              ] as const
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                aria-pressed={view === id}
                aria-label={label}
                title={label}
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-5" />
              </button>
            ))}
          </div>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Filters">
          {LEVELS.map((l) => (
            <Chip key={l} selected={levelF === l} onClick={() => toggle(l, levelF, setLevelF)} className="h-9 px-3">
              {l}
            </Chip>
          ))}
          <Divider />
          {LENGTHS.map((l) => (
            <Chip key={l.id} selected={length === l.id} onClick={() => toggle(l.id, length, setLength)} className="h-9 px-3">
              {l.label}
            </Chip>
          ))}
          <Divider />
          {SOURCES.map((s) => (
            <Chip key={s.id} selected={source === s.id} onClick={() => toggle(s.id, source, setSource)} className="h-9 px-3">
              {s.label}
            </Chip>
          ))}
          {genres.length > 0 && <Divider />}
          {genres.map((g) => (
            <Chip key={g} selected={genre === g} onClick={() => toggle(g, genre, setGenre)} className="h-9 px-3 capitalize">
              {g}
            </Chip>
          ))}
        </div>
      </div>

      {showGrid ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Reading status">
              {TABS.map((t) => {
                const count = t.id === "all" ? books.length : books.filter((b) => b.status === t.id).length;
                return (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "h-9 shrink-0 rounded-lg px-3 text-sm font-semibold transition",
                      tab === t.id ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label} <span className="font-normal opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
            {filtersOn && (
              <button type="button" onClick={clearAll} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <X className="size-4" /> Clear · {visible.length} {visible.length === 1 ? "book" : "books"}
              </button>
            )}
          </div>

          {visible.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visible.map((b) => (
                <li key={b.id}>
                  <BookCard book={b} foundInText={textIds.has(b.id)} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Search} art={<ShelfArt className="w-40" />} title={filtersOn ? "No books match" : "Nothing here yet"} text={filtersOn ? "Try other filters." : emptyTabText(tab)} />
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {shelves.map((s) => (
            <Shelf key={s.title} title={s.title}>
              {s.books.map((b) => (
                <div key={b.id} className="w-32 sm:w-36">
                  <BookCard book={b} />
                </div>
              ))}
            </Shelf>
          ))}
          <button type="button" onClick={() => setView("grid")} className="text-base font-semibold text-primary hover:underline">
            See all {books.length} books →
          </button>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 w-px shrink-0 self-stretch bg-border" aria-hidden />;
}

function emptyTabText(tab: Tab) {
  if (tab === "reading") return "You are not reading a book right now. Open a book and press “Reading now”.";
  if (tab === "finished") return "No finished books yet. You can do it!";
  return "No books here yet.";
}

/** The shelves, best first. Empty shelves are hidden. */
function makeShelves(books: LibraryBook[], level: Level, likedGenres: string[]) {
  const mine = LEVEL_ORDER.indexOf(level);
  const diff = (b: LibraryBook) => (b.level ? LEVEL_ORDER.indexOf(b.level) - mine : 0);
  const readable = books.filter((b) => b.source !== "info_only" && b.chapter_count > 0);
  const open = readable.filter((b) => b.status !== "finished");
  const liked = new Set(likedGenres);

  const forYou = open
    .filter((b) => diff(b) >= 0 && diff(b) <= 1)
    .sort((a, b) => Number(liked.has(b.genre ?? "")) - Number(liked.has(a.genre ?? "")) || diff(a) - diff(b));

  // "Because you liked …": the genre of a finished (or else current) book.
  const seed = readable.find((b) => b.status === "finished" && b.genre) ?? readable.find((b) => b.status === "reading" && b.genre);
  const because = seed ? open.filter((b) => b.genre === seed.genre && b.id !== seed.id) : [];

  const shelves = [
    { title: "Continue", books: readable.filter((b) => b.status === "reading").sort((a, b) => b.percent - a.percent) },
    { title: "For you", books: forYou },
    { title: "Short stories (10 min or less)", books: open.filter((b) => readingMinutes(b.word_count) <= 10) },
    { title: `Classics at your level (${level})`, books: open.filter((b) => b.source === "gutenberg" && diff(b) >= -1 && diff(b) <= 0) },
    { title: seed ? `Because you liked ${seed.title}` : "", books: because },
    { title: "My uploads", books: books.filter((b) => b.source === "upload") },
    { title: "AI stories", books: books.filter((b) => b.source === "ai") },
    { title: "Want to read", books: books.filter((b) => b.status === "want" && b.source === "info_only") },
  ];
  return shelves.filter((s) => s.title && s.books.length > 0).map((s) => ({ ...s, books: s.books.slice(0, 15) }));
}
