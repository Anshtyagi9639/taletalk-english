import { ArrowLeft, BookOpen, ExternalLink, Headphones, Lock, Upload } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookActions } from "@/components/library/book-actions";
import { BookCover } from "@/components/library/book-cover";
import { CoverTint } from "@/components/library/cover-tint";
import { SaveOffline } from "@/components/library/save-offline";
import { buttonVariants } from "@/components/ui/button";
import { LevelBadge } from "@/components/ui/level-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinutes, readingMinutes } from "@/lib/books/levels";
import { getBookDetails } from "@/lib/books/queries";
import { getResumeChapterNumber } from "@/lib/reader/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Book" };

const SOURCE_LABEL = { gutenberg: "Free classic", upload: "My upload", ai: "AI story", info_only: "Info only" };

export default function BookPage({ params }: PageProps<"/library/[id]">) {
  return (
    // The id comes from the URL and the book needs the login cookie: both are request data.
    <Suspense fallback={<BookSkeleton />}>
      {params.then(({ id }) => (
        <BookDetails id={id} />
      ))}
    </Suspense>
  );
}

/** About 160 words a minute with the natural voice at normal speed. */
const listeningMinutes = (words: number) => Math.max(1, Math.round(words / 160));

const pill = "rounded-full bg-card/80 px-3 py-1 text-sm font-semibold ring-1 ring-border";

async function BookDetails({ id }: { id: string }) {
  const [book, resumeNumber] = await Promise.all([getBookDetails(id), getResumeChapterNumber(id)]);
  if (!book) notFound();
  const started = book.status !== "want" || resumeNumber > 1;
  const readable = book.chapter_count > 0;

  return (
    <article className="space-y-8">
      {/* Header tinted with the cover's main color */}
      <CoverTint title={book.title} coverUrl={book.cover_url}>
        <Link href="/library" className="mb-5 inline-flex items-center gap-1 text-base font-medium text-foreground/80 hover:underline">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="w-40 shrink-0 sm:w-48">
            <BookCover title={book.title} author={book.author} coverUrl={book.cover_url} sizes="192px" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{book.title}</h1>
              {book.author && <p className="mt-1 text-lg text-muted-foreground">{book.author}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <LevelBadge level={book.level} size="md" />
              {book.word_count > 0 && (
                <>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <BookOpen className="size-4" aria-hidden /> {formatMinutes(readingMinutes(book.word_count))} reading
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                    <Headphones className="size-4" aria-hidden /> {formatMinutes(listeningMinutes(book.word_count))} listening
                  </span>
                </>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {book.genre && <span className={cn(pill, "capitalize")}>{book.genre}</span>}
              <span className={pill}>{SOURCE_LABEL[book.source]}</span>
              {book.published_year && <span className={pill}>{book.published_year}</span>}
              {readable && <span className={pill}>{book.chapter_count} chapters</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2 sm:justify-start">
          {readable && (
            <Link href={`/reader/${book.id}/${resumeNumber}`} className={cn(buttonVariants({ size: "lg" }), "min-w-36 flex-1 sm:flex-none")}>
              <BookOpen />
              {started ? `Read · chapter ${resumeNumber}` : "Read"}
            </Link>
          )}
          {readable && (
            <Link
              href={`/reader/${book.id}/${resumeNumber}?listen=1`}
              className={cn(buttonVariants({ variant: "soft", size: "lg" }), "min-w-36 flex-1 sm:flex-none")}
            >
              <Headphones /> Listen
            </Link>
          )}
          <BookActions bookId={book.id} status={book.status} />
        </div>
        {book.level_reason && <p className="mt-3 text-sm text-muted-foreground">Level: {book.level_reason}</p>}
      </CoverTint>

      {book.summary && (
        <section className="space-y-2">
          <h2 className="text-xl font-bold">About this book</h2>
          <p className="max-w-prose text-base leading-relaxed whitespace-pre-line">{book.summary}</p>
          {book.source === "info_only" && (
            <p className="text-sm text-muted-foreground">Summary written by AI in simple English (not text from the book).</p>
          )}
          {book.gutenberg_id && (
            <a
              href={`https://www.gutenberg.org/ebooks/${book.gutenberg_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"
            >
              From Project Gutenberg <ExternalLink className="size-3.5" />
            </a>
          )}
        </section>
      )}

      {book.source === "info_only" && <ReadLegally title={book.title} author={book.author} openLibraryUrl={book.external_url} />}

      {book.chapters.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold">Chapters</h2>
            <SaveOffline bookId={book.id} chapterNumbers={book.chapters.map((c) => c.number)} />
          </div>
          <ol className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
            {book.chapters.map((c) => {
              const here = started && c.number === resumeNumber;
              const done = started && c.number < resumeNumber;
              return (
                <li key={c.id}>
                  <Link href={`/reader/${book.id}/${c.number}`} className={cn("flex items-center gap-3 px-4 py-3 transition hover:bg-muted/60", here && "bg-primary-soft")}>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                        here ? "bg-primary text-primary-foreground" : done ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {c.number}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-base", here && "font-semibold")}>{c.title}</span>
                    {here && <span className="shrink-0 text-xs font-bold text-primary">You are here</span>}
                    <span className="shrink-0 text-sm text-muted-foreground">{formatMinutes(readingMinutes(c.word_count))}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </article>
  );
}

function BookSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the book">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Skeleton className="aspect-[2/3] w-40 sm:w-48" />
        <div className="w-full flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-12 w-60" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

/** For books still under copyright: no text in the app, but legal ways to read it. */
function ReadLegally({ title, author, openLibraryUrl }: { title: string; author: string | null; openLibraryUrl: string | null }) {
  const q = encodeURIComponent([title, author].filter(Boolean).join(" "));
  const links = [
    openLibraryUrl && { href: openLibraryUrl, label: "Open Library (borrow for free, if available)" },
    { href: `https://www.google.com/search?tbm=bks&q=${q}`, label: "Google Books" },
    { href: `https://www.amazon.com/s?k=${q}&i=digital-text`, label: "Amazon Kindle" },
  ].filter((l): l is { href: string; label: string } => Boolean(l));

  return (
    <section className="space-y-3 rounded-card bg-warm-soft p-5">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 size-5 shrink-0 text-warm-text" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-lg font-bold">This book is still under copyright</h2>
          <p className="text-base">
            So the full text is not in the app. You can read it in these places, or upload your own copy (EPUB or PDF) to read it here with
            all the help tools.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-base font-medium text-primary underline-offset-4 hover:underline">
              {l.label} <ExternalLink className="size-4" />
            </a>
          </li>
        ))}
      </ul>
      <Link href="/library/add#upload" className={buttonVariants({ variant: "outline", size: "lg" })}>
        <Upload /> Upload my copy
      </Link>
    </section>
  );
}
