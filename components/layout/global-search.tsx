"use client";

import { Dialog } from "@base-ui/react/dialog";
import { BookOpen, CornerDownLeft, Languages, Loader2, MessageSquareQuote, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { searchEverything, type SearchResults } from "@/app/(app)/search-actions";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "taletalk:open-search";

/** Opens the search from anywhere (e.g. the search icon on phones). */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Item = { key: string; group: string; label: string; hint?: string; href: string; icon: ReactNode };

/**
 * Global search (Ctrl+K / ⌘K on laptop, search icon on phone):
 * finds pages, my books, saved words and saved phrases.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Ctrl+K / ⌘K, and the custom "open" event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Search my data a moment after I stop typing.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchEverything(q);
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults({ books: [], words: [], phrases: [] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    const pages = NAV_ITEMS.filter((p) => !q || p.label.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q)).map((p) => ({
      key: `page:${p.href}`,
      group: "Pages",
      label: p.label,
      hint: p.hint,
      href: p.href,
      icon: <p.icon className="size-5" />,
    }));
    if (q.length < 2 || !results) return pages;
    return [
      ...results.books.map((b) => ({
        key: `book:${b.id}`,
        group: "My books",
        label: b.title,
        hint: [b.author, b.level].filter(Boolean).join(" · "),
        href: `/library/${b.id}`,
        icon: <BookOpen className="size-5" />,
      })),
      ...results.words.map((w) => ({
        key: `word:${w.id}`,
        group: "Saved words",
        label: w.word,
        hint: w.meaning,
        href: `/progress/words`,
        icon: <Languages className="size-5" />,
      })),
      ...results.phrases.map((p) => ({
        key: `phrase:${p.id}`,
        group: "Saved phrases",
        label: p.phrase,
        hint: p.situation,
        href: `/practice/phrases`,
        icon: <MessageSquareQuote className="size-5" />,
      })),
      ...pages,
    ];
  }, [query, results]);

  function go(item: Item | undefined) {
    if (!item) return;
    setOpen(false);
    router.push(item.href);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setResults(null);
      setActive(0);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[active]);
    }
  }

  const searching = query.trim().length >= 2;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 dark:bg-black/65" />
        <Dialog.Popup className="fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-50 mx-auto flex max-h-[min(36rem,80dvh)] max-w-xl flex-col overflow-hidden rounded-sheet bg-popover text-popover-foreground shadow-lift ring-1 ring-border transition-[opacity,transform] duration-200 ease-(--ease-out-soft) outline-none data-ending-style:-translate-y-2 data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:opacity-0 sm:top-[12dvh]">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-3 border-b px-4">
            {loading ? <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" /> : <Search className="size-5 shrink-0 text-muted-foreground" />}
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search books, words, phrases, pages…"
              aria-label="Search"
              role="combobox"
              aria-expanded
              aria-controls="global-search-list"
              aria-activedescendant={items[active] ? `gs-${active}` : undefined}
              className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded-md border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground sm:block">Esc</kbd>
          </div>

          <ul ref={listRef} id="global-search-list" role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-2">
            {items.map((item, i) => (
              <li key={item.key} role="presentation">
                {(i === 0 || items[i - 1].group !== item.group) && (
                  <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{item.group}</p>
                )}
                <div
                  id={`gs-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                    i === active ? "bg-primary-soft text-foreground" : "text-foreground",
                  )}
                >
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", i === active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium">{item.label}</span>
                    {item.hint && <span className="block truncate text-sm text-muted-foreground">{item.hint}</span>}
                  </span>
                  {i === active && <CornerDownLeft className="hidden size-4 text-muted-foreground sm:block" aria-hidden />}
                </div>
              </li>
            ))}
            {searching && !loading && results && items.every((i) => i.group === "Pages") && (
              <li className="px-3 py-6 text-center text-base text-muted-foreground">No books, words or phrases found for “{query.trim()}”.</li>
            )}
          </ul>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
