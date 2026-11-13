"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BOTTOM_ITEMS, MORE_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Bottom tab bar for phones (hidden on bigger screens): Today, Library, Reader, Talk, More. */
export function BottomNav() {
  return (
    <nav
      aria-label="Main menu"
      // Floating "glass" bar: rounded, see-through with blur, lifted above the screen edge.
      className="fixed inset-x-3 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 rounded-[1.75rem] bg-card/75 shadow-lift ring-1 ring-border backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      {/* The current URL is request data on pages like /library/[id], so it needs <Suspense>.
          Until it is known, the tabs show with none highlighted. */}
      <Suspense fallback={<BottomLinks pathname={null} />}>
        <CurrentBottomLinks />
      </Suspense>
    </nav>
  );
}

function CurrentBottomLinks() {
  return <BottomLinks pathname={usePathname()} />;
}

function BottomLinks({ pathname }: { pathname: string | null }) {
  return (
    <ul className="grid grid-cols-5">
      {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
        // "More" stays highlighted when you are on one of its pages.
        const active =
          pathname !== null &&
          (href === "/more"
            ? isActive(href, pathname) || MORE_ITEMS.some((i) => isActive(i.href, pathname))
            : isActive(href, pathname));
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-0.5 text-xs transition-transform outline-none active:scale-[0.97]",
                active ? "font-bold text-primary" : "font-medium text-muted-foreground",
              )}
            >
              {/* Active tab: filled icon in a soft pill. */}
              <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200", active && "bg-primary-soft")}>
                <Icon className={cn("size-6", active && "fill-primary/20")} aria-hidden />
              </span>
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
