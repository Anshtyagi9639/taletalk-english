import { LibraryBig } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { AddBookFab } from "@/components/library/add-book-fab";
import { LibraryView } from "@/components/library/library-view";
import { StarterBooks } from "@/components/library/starter-books";
import { ShelfArt } from "@/components/ui/illustrations";
import { ShelfSkeleton, Skeleton } from "@/components/ui/skeleton";
import { getLibraryBooks } from "@/lib/books/queries";
import { getProfile } from "@/lib/profile";
import { genresForInterests } from "@/lib/topics";

export const metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <>
      <PageHeader icon={LibraryBig} title="Library" description="All your stories and books." art={<ShelfArt className="w-32" />} />
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryContent />
      </Suspense>
      <AddBookFab />
    </>
  );
}

/** Reads my books (needs the login cookie, so it sits inside <Suspense>). */
async function LibraryContent() {
  const [books, profile] = await Promise.all([getLibraryBooks(), getProfile()]);

  if (books.length === 0) {
    return (
      <section className="space-y-4 rounded-card bg-card p-5 shadow-soft ring-1 ring-border sm:p-6">
        <div>
          <h2 className="text-xl font-bold">Your library is empty</h2>
          <p className="mt-1 text-base text-muted-foreground">Start with these free classic books. They go from easy (A2) to harder (C1).</p>
        </div>
        <StarterBooks addedIds={[]} />
      </section>
    );
  }

  return <LibraryView books={books} level={profile.level} likedGenres={[...genresForInterests(profile.interests)]} />;
}

function LibrarySkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your books">
      <Skeleton className="h-12 rounded-xl" />
      <ShelfSkeleton />
      <ShelfSkeleton />
    </div>
  );
}
