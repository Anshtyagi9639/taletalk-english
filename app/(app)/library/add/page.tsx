import { ArrowLeft, LibraryBig, Sparkles } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { BookSearch } from "@/components/library/book-search";
import { StarterBooks } from "@/components/library/starter-books";
import { PhotoSearch } from "@/components/library/photo-search";
import { UploadBooks } from "@/components/library/upload-books";
import { getMyGutenbergIds } from "@/lib/books/queries";

export const metadata = { title: "Add books" };

export default function AddBooksPage() {
  return (
    <>
      <Link href="/library" className="mb-3 inline-flex items-center gap-1 text-base text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Library
      </Link>
      <PageHeader icon={LibraryBig} tone="blue" title="Add books" description="Free classic books, or upload your own." />
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
        <AddBooksContent />
      </Suspense>
    </>
  );
}

/** Needs my book list (login cookie), so it is inside <Suspense>. */
async function AddBooksContent() {
  const addedIds = await getMyGutenbergIds();
  return (
    <div className="space-y-10">
      <Link
        href="/library/create"
        className="flex items-center gap-4 rounded-card border border-primary/25 bg-primary-soft p-4 transition hover:border-primary/50"
      >
        <Sparkles className="size-8 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold">Create a story for me</span>
          <span className="block text-sm text-muted-foreground">AI writes a new story for your level and topic.</span>
        </span>
      </Link>
      <section id="search" className="scroll-mt-6">
        <BookSearch addedIds={addedIds} />
      </section>
      <section id="photo" className="scroll-mt-6 space-y-3">
        <div>
          <h2 className="text-xl font-bold">Take a photo of a book</h2>
          <p className="text-base text-muted-foreground">
            Saw a book in a shop or at a friend’s home? Take a photo of the cover and we find it.
          </p>
        </div>
        <PhotoSearch addedIds={addedIds} />
      </section>
      <section id="upload" className="scroll-mt-6 space-y-3">
        <div>
          <h2 className="text-xl font-bold">Upload my own books</h2>
          <p className="text-base text-muted-foreground">
            Books you own (DRM-free). Files stay private: only you can see them.
          </p>
        </div>
        <UploadBooks />
      </section>
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Starter books</h2>
          <p className="text-base text-muted-foreground">Nine good classics for learners, from easy to hard.</p>
        </div>
        <StarterBooks addedIds={addedIds} />
      </section>
    </div>
  );
}
