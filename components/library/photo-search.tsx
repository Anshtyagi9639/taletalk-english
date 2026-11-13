"use client";

import { Camera, Check, ExternalLink, ImageUp, Loader2, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { addGutenbergBook } from "@/app/(app)/library/actions";
import { addInfoOnlyBook, findBookMatches, readBookPhoto, type BookMatches } from "@/app/(app)/library/photo-actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { shrinkPhoto } from "@/lib/image";
import type { OpenLibraryResult } from "@/lib/books/types";
import { cn } from "@/lib/utils";
import { BookCover } from "./book-cover";
import { CameraCapture, canUseLiveCamera } from "./camera-capture";
import { ClassicRow, type AddState } from "./book-search";

type InfoState = { status: "adding" } | { status: "added"; bookId: string } | { status: "error"; error: string };

/** "Take a photo of a book": photo → AI reads title/author → matches → add. */
export function PhotoSearch({ addedIds }: { addedIds: number[] }) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [step, setStep] = useState<"start" | "reading" | "searching" | "results">("start");
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [unsure, setUnsure] = useState(false);
  const [matches, setMatches] = useState<BookMatches | null>(null);
  const [classicAdds, setClassicAdds] = useState<Record<number, AddState>>({});
  const [infoAdds, setInfoAdds] = useState<Record<string, InfoState>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  // Live camera fails (no permission, no camera) → use the phone's camera app instead.
  const cameraFailed = useCallback(() => cameraRef.current?.click(), []);

  function reset() {
    setPhoto(null);
    setStep("start");
    setError(null);
    setMatches(null);
    setTitle("");
    setAuthor("");
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    setMatches(null);
    setStep("reading");
    try {
      const image = await shrinkPhoto(file);
      setPhoto(image);
      const read = await readBookPhoto(image);
      if (!read.ok) throw new Error(read.error);
      setTitle(read.data.title);
      setAuthor(read.data.author);
      setUnsure(read.data.confidence !== "high");
      await search(read.data.title, read.data.author);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("start");
    }
  }

  async function search(t: string, a: string) {
    setStep("searching");
    setError(null);
    const res = await findBookMatches(t, a);
    if (res.ok) setMatches(res.data);
    else setError(res.error);
    setStep("results");
  }

  function onSearchAgain(e: FormEvent) {
    e.preventDefault();
    void search(title, author);
  }

  async function addClassic(id: number) {
    setClassicAdds((s) => ({ ...s, [id]: { status: "adding" } }));
    const r = await addGutenbergBook(id);
    setClassicAdds((s) => ({
      ...s,
      [id]: r.ok ? { status: "added", bookId: r.bookId, chapters: r.chapters } : { status: "error", error: r.error },
    }));
  }

  async function addInfo(b: OpenLibraryResult) {
    setInfoAdds((s) => ({ ...s, [b.key]: { status: "adding" } }));
    const r = await addInfoOnlyBook({ key: b.key, title: b.title, author: b.author, year: b.year });
    setInfoAdds((s) => ({ ...s, [b.key]: r.ok ? { status: "added", bookId: r.bookId } : { status: "error", error: r.error } }));
  }

  const busy = step === "reading" || step === "searching";

  return (
    <div className="space-y-4">
      {/* Hidden file inputs: camera (phone) and gallery */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
        void onPhoto(e.target.files?.[0]);
        e.target.value = "";
      }} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
        void onPhoto(e.target.files?.[0]);
        e.target.value = "";
      }} />

      <CameraCapture open={cameraOpen} onOpenChange={setCameraOpen} onPhoto={(f) => void onPhoto(f)} onFail={cameraFailed} />

      {step === "start" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Button className="h-14 text-base" onClick={() => (canUseLiveCamera() ? setCameraOpen(true) : cameraRef.current?.click())}>
            <Camera className="size-5" /> Take photo of a book
          </Button>
          <Button variant="outline" className="h-14 text-base" onClick={() => galleryRef.current?.click()}>
            <ImageUp className="size-5" /> Choose a photo
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-destructive-soft p-3 text-base text-destructive">
          {error}
        </p>
      )}

      {step !== "start" && (
        <div className="flex gap-4">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- a local preview (data URL), not a web image
            <img src={photo} alt="Your photo" className="h-32 w-24 shrink-0 rounded-lg object-cover shadow-sm" />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            {step === "reading" ? (
              <p className="flex items-center gap-2 text-base" role="status">
                <Loader2 className="size-5 animate-spin" /> Reading the cover…
              </p>
            ) : (
              <form onSubmit={onSearchAgain} className="space-y-2">
                {unsure && <p className="text-sm text-muted-foreground">The photo was not very clear. Please check the title.</p>}
                <div className="space-y-1">
                  <Label htmlFor="photo-title">Title</Label>
                  <Input id="photo-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 text-base" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="photo-author">Author</Label>
                  <Input id="photo-author" value={author} onChange={(e) => setAuthor(e.target.value)} className="h-10 text-base" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="secondary" disabled={busy}>
                    {step === "searching" ? <Loader2 className="animate-spin" /> : <Search />} Search again
                  </Button>
                  <Button type="button" variant="ghost" onClick={reset} disabled={busy}>
                    <RotateCcw /> New photo
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {step === "searching" && (
        <p className="flex items-center gap-2 text-base text-muted-foreground" role="status">
          <Loader2 className="size-5 animate-spin" /> Looking for this book…
        </p>
      )}

      {step === "results" && matches && (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-base font-semibold">Free full book (public domain)</h3>
            {matches.classics.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Not found as a free book. It is probably still under copyright. See the book info below.
              </p>
            ) : (
              <ul className="space-y-3">
                {matches.classics.map((b) => (
                  <ClassicRow
                    key={b.gutenbergId}
                    book={b}
                    inLibrary={addedIds.includes(b.gutenbergId)}
                    state={classicAdds[b.gutenbergId]}
                    onAdd={() => addClassic(b.gutenbergId)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">Book info (if it is still under copyright)</h3>
            <p className="text-sm text-muted-foreground">
              We save the details, a short summary and links to read it legally. You can upload your own copy later.
            </p>
            {matches.info.length === 0 ? (
              <p className="text-base text-muted-foreground">No book info found. Try changing the title above.</p>
            ) : (
              <ul className="space-y-3">
                {matches.info.map((b) => (
                  <InfoRow key={b.key} book={b} state={infoAdds[b.key]} onAdd={() => addInfo(b)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function InfoRow({ book, state, onAdd }: { book: OpenLibraryResult; state?: InfoState; onAdd: () => void }) {
  return (
    <li className="flex gap-3 rounded-card bg-card shadow-soft ring-1 ring-border p-3">
      <div className="w-16 shrink-0 sm:w-20">
        <BookCover title={book.title} coverUrl={book.coverUrl} sizes="80px" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-base font-semibold">{book.title}</p>
        <p className="truncate text-sm text-muted-foreground">{[book.author, book.year].filter(Boolean).join(" · ")}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {state?.status === "added" ? (
            <Link href={`/library/${state.bookId}`} className={cn(buttonVariants({ variant: "outline" }), "h-9 text-sm")}>
              <Check className="text-success" /> Saved – Open
            </Link>
          ) : (
            <Button variant="outline" onClick={onAdd} disabled={state?.status === "adding"} className="h-9 text-sm">
              {state?.status === "adding" && <Loader2 className="animate-spin" />}
              {state?.status === "adding" ? "Writing a short summary…" : "Save book info"}
            </Button>
          )}
          <Badge variant="muted">Info only</Badge>
          <a href={book.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
            Open Library <ExternalLink className="size-3.5" />
          </a>
        </div>
        {state?.status === "error" && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </li>
  );
}
