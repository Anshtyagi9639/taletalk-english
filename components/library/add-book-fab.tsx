"use client";

import { Camera, ChevronRight, FileUp, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";

const CHOICES = [
  { href: "/library/add#search", icon: Search, title: "Search free books", text: "Classic books from Project Gutenberg" },
  { href: "/library/add#upload", icon: FileUp, title: "Upload a file", text: "PDF, EPUB, DOCX or TXT you own" },
  { href: "/library/add#photo", icon: Camera, title: "Photo of a book", text: "Take a photo of the cover — we find it" },
  { href: "/library/create", icon: Sparkles, title: "Create an AI story", text: "A new story for your level and topic" },
];

/** Floating "+" button (above the tab bar on phones) that opens the 4 ways to add a book. */
export function AddBookFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add books"
        className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-base font-bold text-primary-foreground shadow-lift transition-transform hover:bg-primary/90 active:scale-[0.97] focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none md:right-8 md:bottom-8"
      >
        <Plus className="size-6" /> <span>Add</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title="Add books" description="Choose how you want to add a book.">
        <ul className="space-y-2">
          {CHOICES.map(({ href, icon: Icon, title, text }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-4 rounded-2xl border p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold">{title}</span>
                  <span className="block text-sm text-muted-foreground">{text}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
