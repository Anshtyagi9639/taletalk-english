"use client";

import { Check, CircleAlert, FileUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { processUpload } from "@/app/(app)/library/actions";
import { buttonVariants } from "@/components/ui/button";
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES, uploadExt } from "@/lib/books/upload-types";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  file: File;
  state: "waiting" | "uploading" | "reading" | "done" | "error";
  progress: number; // 0-100 while uploading
  error?: string;
  bookId?: string;
  chapters?: number;
};

const ACCEPT = ".pdf,.epub,.docx,.txt";

function sizeText(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Sends a file straight from the browser to Supabase Storage, with progress.
 * (Big files cannot go through our server: Vercel allows only 4.5 MB per request.)
 */
function uploadToStorage(file: File, path: string, token: string, onProgress: (pct: number) => void) {
  const env = getSupabaseEnv();
  if (!env) return Promise.reject(new Error("Supabase is not set up."));
  const ext = uploadExt(file.name)!;
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${env.url}/storage/v1/object/books/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", env.key);
    xhr.setRequestHeader("Content-Type", UPLOAD_TYPES[ext]);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      if (xhr.status === 413) return reject(new Error("This file is too big (max 50 MB)."));
      if (xhr.status === 401 || xhr.status === 403) return reject(new Error("Please log in again."));
      reject(new Error("The upload failed. Please try again."));
    };
    xhr.onerror = () => reject(new Error("The upload failed. Please check your internet."));
    xhr.send(file);
  });
}

/** "Upload my own books": drag & drop or choose files (PDF, EPUB, DOCX, TXT). */
export function UploadBooks() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = useRef(false);
  const queue = useRef<Item[]>([]);

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));

  function addFiles(files: FileList | File[]) {
    const fresh: Item[] = [...files].map((file) => {
      const base: Item = { id: crypto.randomUUID(), file, state: "waiting", progress: 0 };
      if (!uploadExt(file.name)) return { ...base, state: "error", error: "Please choose a PDF, EPUB, DOCX or TXT file." };
      if (file.size === 0) return { ...base, state: "error", error: "This file is empty." };
      if (file.size > MAX_UPLOAD_BYTES) return { ...base, state: "error", error: "This file is too big (max 50 MB)." };
      return base;
    });
    setItems((list) => [...fresh, ...list]);
    queue.current.push(...fresh.filter((i) => i.state === "waiting"));
    void runQueue();
  }

  /** One file at a time: upload → read on the server. */
  async function runQueue() {
    if (busy.current) return;
    busy.current = true;
    let addedAny = false;
    while (queue.current.length > 0) {
      const item = queue.current.shift()!;
      try {
        const { data } = await createClient().auth.getSession();
        const session = data.session;
        if (!session) throw new Error("Please log in again.");
        const path = `${session.user.id}/${crypto.randomUUID()}.${uploadExt(item.file.name)}`;

        patch(item.id, { state: "uploading", progress: 0 });
        await uploadToStorage(item.file, path, session.access_token, (progress) => patch(item.id, { progress }));

        patch(item.id, { state: "reading" });
        const result = await processUpload(path, item.file.name);
        if (!result.ok) throw new Error(result.error);
        patch(item.id, { state: "done", bookId: result.bookId, chapters: result.chapters });
        addedAny = true;
      } catch (err) {
        patch(item.id, { state: "error", error: err instanceof Error ? err.message : "Something went wrong." });
      }
    }
    busy.current = false;
    if (addedAny) router.refresh();
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition",
          dragging ? "border-primary bg-primary/5" : "hover:bg-muted/50",
        )}
      >
        <FileUp className="size-8 text-muted-foreground" aria-hidden />
        <span className="text-base font-medium">Drop files here, or tap to choose</span>
        <span className="text-sm text-muted-foreground">PDF, EPUB, DOCX, TXT · up to 50 MB each · many at once</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = ""; // allow choosing the same file again
        }}
      />

      {items.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-card bg-card shadow-soft ring-1 ring-border">
          {items.map((i) => (
            <li key={i.id} className="space-y-1.5 p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{i.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {sizeText(i.file.size)} ·{" "}
                    {i.state === "waiting" && "Waiting…"}
                    {i.state === "uploading" && `Uploading ${i.progress}%`}
                    {i.state === "reading" && "Reading the book…"}
                    {i.state === "done" && `Added · ${i.chapters} chapters`}
                    {i.state === "error" && "Could not add"}
                  </p>
                </div>
                {(i.state === "uploading" || i.state === "reading") && (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
                )}
                {i.state === "done" && i.bookId && (
                  <Link href={`/library/${i.bookId}`} className={cn(buttonVariants({ variant: "outline" }), "h-9")}>
                    <Check className="text-success" /> Open
                  </Link>
                )}
                {i.state === "error" && <CircleAlert className="size-5 text-destructive" aria-hidden />}
              </div>
              {i.state === "uploading" && (
                <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={i.progress} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${i.progress}%` }} />
                </div>
              )}
              {i.state === "error" && <p className="text-sm text-destructive">{i.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
