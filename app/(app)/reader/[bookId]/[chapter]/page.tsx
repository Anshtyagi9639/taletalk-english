import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReaderView } from "@/components/reader/reader-view";
import { getReaderChapter, getVoicePrefs } from "@/lib/reader/queries";

export const metadata = { title: "Reader" };

export default function ReaderChapterPage({ params }: PageProps<"/reader/[bookId]/[chapter]">) {
  return (
    // The ids come from the URL and the text needs the login cookie: request data → <Suspense>.
    <Suspense fallback={<ReaderSkeleton />}>
      {params.then(({ bookId, chapter }) => (
        <ChapterLoader bookId={bookId} number={Number(chapter)} />
      ))}
    </Suspense>
  );
}

async function ChapterLoader({ bookId, number }: { bookId: string; number: number }) {
  const [data, voicePrefs] = await Promise.all([getReaderChapter(bookId, number), getVoicePrefs()]);
  if (!data) notFound();
  const { book, chapter, chapterTitles, resumeAt } = data;

  return (
    <ReaderView
      key={chapter.id} // fresh reader state for every chapter
      bookId={book.id}
      bookTitle={book.title}
      chapterId={chapter.id}
      chapterNumber={chapter.number}
      chapterTitle={chapter.title}
      chapterCount={book.chapter_count}
      chapterTitles={chapterTitles}
      paragraphs={chapter.content.split("\n\n")}
      resumeAt={resumeAt}
      initialVoice={voicePrefs.voice}
      initialSpeed={voicePrefs.speed}
    />
  );
}

function ReaderSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading the chapter">
      <div className="h-12 animate-pulse rounded-lg bg-muted" />
      <div className="h-11 animate-pulse rounded-lg bg-muted" />
      <div className="space-y-3 rounded-2xl bg-muted/50 p-6">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-muted" style={{ width: `${70 + ((i * 13) % 30)}%` }} />
        ))}
      </div>
    </div>
  );
}
