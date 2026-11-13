import { BookOpen } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BookCover } from "@/components/library/book-cover";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getContinueReading } from "@/lib/reader/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reader" };

export default function ReaderPage() {
  return (
    <>
      <PageHeader icon={BookOpen} tone="blue" title="Reader" description="Pick up where you stopped." />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <ContinueList />
      </Suspense>
    </>
  );
}

async function ContinueList() {
  const items = await getContinueReading(10);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-2">
          <BookOpen className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-base">You are not reading a book right now. Choose one from your Library.</p>
          <Link href="/library" className={cn(buttonVariants({ size: "lg" }), "h-11 px-4 text-base")}>
            Open Library
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((b) => (
        <li key={b.bookId}>
          <Link
            href={`/reader/${b.bookId}/${b.chapterNumber}`}
            className="flex gap-4 rounded-xl border p-3 transition hover:bg-muted/50 bg-card"
          >
            <div className="w-16 shrink-0">
              <BookCover title={b.title} coverUrl={b.coverUrl} sizes="64px" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-base font-semibold">{b.title}</p>
              {b.chapterTitle && (
                <p className="truncate text-sm text-muted-foreground">
                  Chapter {b.chapterNumber}: {b.chapterTitle}
                </p>
              )}
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, b.percent)}%` }} />
                </div>
                <span className="text-sm text-muted-foreground tabular-nums">{Math.round(b.percent)}%</span>
              </div>
              <p className="text-sm font-medium text-primary">Continue reading →</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
