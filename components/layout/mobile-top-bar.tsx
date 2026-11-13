"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { openSearch } from "./global-search";
import { Logo } from "./logo";

/** Slim top bar on phones: logo + search icon (laptops have the sidebar instead). */
export function MobileTopBar() {
  return (
    <header className="relative z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-lg md:hidden">
      <Link href="/" aria-label="TaleTalk home" className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&_span.size-10]:size-8">
        <Logo />
      </Link>
      <button
        type="button"
        onClick={openSearch}
        aria-label="Search"
        className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted active:scale-[0.97] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Search className="size-5" />
      </button>
    </header>
  );
}
