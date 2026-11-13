"use client";

import { BookOpenCheck, Check, ExternalLink, Loader2, Lock, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { addGutenbergBook } from "@/app/(app)/library/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GutenbergResult, OpenLibraryResult } from "@/lib/books/types";
import { cn } from "@/lib/utils";
import { BookCover } from "./book-cover";

type SearchResponse = { classics: GutenbergResult[]; openLibrary: OpenLibraryResult[]; via: string | null };
export type AddState =
  | { status: "adding" }
  | { status: "added"; bookId: string; chapters: number }
  | { status: "error"; error: string };

/** "Search free classic books": Gutenberg results you can add + Open Library book info. */
export function BookSearch({ addedIds }: { addedIds: number[] }) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "topic">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [adds, setAdds] = useState<Record<number, AddState>>({});

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Please type at least 2 letters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}&mode=${mode}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed.");
      setData(json as SearchResponse);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onAdd(id: number) {
    setAdds((a) => ({ ...a, [id]: { status: "adding" } }));
    const result = await addGutenbergBook(id);
    setAdds((a) => ({
      ...a,
      [id]: result.ok ? { status: "added", bookId: result.bookId, chapters: result.chapters } : { status: "error", error: result.error },
    }));
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSearch} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === "topic" ? "Topic, e.g. pirates, love, ghosts" : "Title or author, e.g. Dickens"}
              aria-label="Search free classic books"
              className="h-12 pl-10 text-base"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 px-5 text-base">
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            <span className="hidden sm:inline">Search</span>
          </Button>
        </div>
        <div className="flex gap-2" role="radiogroup" aria-label="Search by">
          {(["all", "topic"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-9 rounded-full border px-4 text-sm font-medium",
                mode === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {m === "all" ? "Title or author" : "Topic"}
            </button>
          ))}
        </div>
      </form>

      {loading && (
        <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-base" role="status">
          <Loader2 className="size-5 animate-spin" /> Searching free books… this can take up to 20 seconds.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}

      {data && !loading && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Free classic books ({data.classics.length})</h2>
            {data.classics.length === 0 ? (
              <p className="text-base text-muted-foreground">No free books found. Try other words.</p>
            ) : (
              <ul className="space-y-3">
                {data.classics.map((b) => (
                  <ClassicRow
                    key={b.gutenbergId}
                    book={b}
                    inLibrary={addedIds.includes(b.gutenbergId)}
                    state={adds[b.gutenbergId]}
                    onAdd={() => onAdd(b.gutenbergId)}
                  />
                ))}
              </ul>
            )}
          </section>

          {data.openLibrary.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">Book info from Open Library</h2>
                <p className="text-sm text-muted-foreground">
                  Newer books are not free. You can see the info here, and later upload your own copy (EPUB/PDF).
                </p>
              </div>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {data.openLibrary.map((b) => (
                  <li key={b.key}>
                    <a href={b.url} target="_blank" rel="noopener noreferrer" className="group block space-y-1">
                      <BookCover title={b.title} author={b.author} coverUrl={b.coverUrl} sizes="120px" />
                      <p className="line-clamp-2 text-sm font-medium group-hover:underline">{b.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[b.author, b.year].filter(Boolean).join(" · ")}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

/** One free classic book with an "Add to Library" button (also used by the photo search). */
export function ClassicRow({
  book,
  inLibrary,
  state,
  onAdd,
}: {
  book: GutenbergResult;
  inLibrary: boolean;
  state?: AddState;
  onAdd: () => void;
}) {
  const added = state?.status === "added";
  return (
    <li className="flex gap-3 rounded-card bg-card shadow-soft ring-1 ring-border p-3">
      <div className="w-16 shrink-0 sm:w-20">
        <BookCover title={book.title} coverUrl={book.coverUrl} sizes="80px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-base font-semibold">{book.title}</p>
        {book.author && <p className="truncate text-sm text-muted-foreground">{book.author}</p>}
        <div className="flex flex-wrap gap-1">
          {book.levelGuess && <Badge title="Rough guess. We measure the real level when you add it.">~{book.levelGuess}</Badge>}
          {book.genre && <Badge variant="muted">{book.genre}</Badge>}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {book.publicDomain === false ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Lock className="size-4" /> Still under copyright (no full text)
            </span>
          ) : added ? (
            <Link href={`/library/${state.bookId}`} className={cn(buttonVariants({ variant: "outline" }), "h-9 text-sm")}>
              <Check className="text-success" /> Added ({state.chapters} chapters) – Open
            </Link>
          ) : inLibrary ? (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <BookOpenCheck className="size-4" /> In your library
            </span>
          ) : (
            <Button onClick={onAdd} disabled={state?.status === "adding"} className="h-9 text-sm">
              {state?.status === "adding" ? <Loader2 className="animate-spin" /> : <Plus />}
              {state?.status === "adding" ? "Adding… (downloading)" : "Add to Library"}
            </Button>
          )}
          <a
            href={`https://www.gutenberg.org/ebooks/${book.gutenbergId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Gutenberg <ExternalLink className="size-3.5" />
          </a>
        </div>
        {state?.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </li>
  );
}
