import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/ui/level-badge";
import { formatMinutes, readingMinutes } from "@/lib/books/levels";
import type { LibraryBook } from "@/lib/books/types";
import { BookCover } from "./book-cover";

/** One book in the Library grid. */
export function BookCard({ book, foundInText }: { book: LibraryBook; foundInText?: boolean }) {
  return (
    <Link
      href={`/library/${book.id}`}
      className="group flex flex-col gap-2 rounded-xl p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="relative">
        <BookCover
          title={book.title}
          author={book.author}
          coverUrl={book.cover_url}
          className="transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lift"
        />
        {book.status === "reading" && book.percent > 0 && (
          <div className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/30">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.min(100, book.percent)}%` }} />
          </div>
        )}
      </div>
      <div className="min-w-0 space-y-1 px-0.5">
        <p className="line-clamp-2 text-base leading-snug font-bold group-hover:text-primary">{book.title}</p>
        {book.author && <p className="truncate text-sm text-muted-foreground">{book.author}</p>}
        <div className="flex flex-wrap items-center gap-1">
          <LevelBadge level={book.level} />
          {book.word_count > 0 && <Badge variant="muted">{formatMinutes(readingMinutes(book.word_count))}</Badge>}
          {book.source === "info_only" && <Badge variant="outline">Info only</Badge>}
          {book.status === "finished" && <Badge className="bg-success-soft text-success">Finished ✓</Badge>}
          {foundInText && <Badge variant="outline">Word found</Badge>}
        </div>
      </div>
    </Link>
  );
}
