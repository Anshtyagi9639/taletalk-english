"use client";

import { LogOut, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useSyncExternalStore, type ReactNode } from "react";
import { NAV_ITEMS, isActive } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { openSearch } from "./global-search";
import { Logo } from "./logo";
import { clearOfflinePages } from "./sw-register";

/** The menu in three groups: daily learning, practice tools, and you. */
const GROUPS = [
  { title: "Learn", hrefs: ["/", "/library", "/reader", "/talk"] },
  { title: "Practise", hrefs: ["/practice", "/speak", "/interview"] },
  { title: "You", hrefs: ["/progress", "/settings"] },
];

// Folded or open: remembered in this browser only (a per-device convenience).
const KEY = "taletalk.sidebar.collapsed";
const EVENT = "taletalk-sidebar";
let memory = false;
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return memory;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Left menu for tablets and laptops (hidden on phones).
 * - Tablet (iPad portrait / split view): icons only, so the content has room.
 * - Large screens: full menu with labels; it can be folded to icons (remembered).
 * `footer` (email + log out) shows when the menu is open.
 */
export function AppSidebar({ footer }: { footer: ReactNode }) {
  const folded = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const toggle = useCallback(() => {
    memory = !readCollapsed();
    try {
      localStorage.setItem(KEY, memory ? "1" : "0");
    } catch {
      // Storage blocked: remembered until the page reloads.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  // "wide" = classes that only apply when the full menu is shown (large screens, not folded).
  const wide = (cls: string) => (folded ? "" : cls);
  const label = folded ? "sr-only" : "sr-only lg:not-sr-only";

  return (
    <aside
      data-collapsed={folded}
      className={cn(
        "group/sidebar sticky top-0 hidden h-dvh w-[84px] shrink-0 flex-col border-r bg-sidebar/80 text-sidebar-foreground backdrop-blur-xl transition-[width] duration-200 ease-(--ease-out-soft) md:flex",
        wide("lg:w-64"),
      )}
    >
      <div className={cn("flex flex-col items-center gap-3 px-3 pt-6 pb-4", wide("lg:flex-row lg:justify-between lg:px-5"))}>
        <Link href="/" aria-label="TaleTalk home" className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo labelClassName={label} />
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-label={folded ? "Open the menu" : "Fold the menu"}
          title={folded ? "Open the menu" : "Fold the menu"}
          className={cn(
            "size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            // On tablets the menu is always icons-only, so the button only shows on large screens.
            "hidden lg:flex",
          )}
        >
          {folded ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search (Ctrl+K)"
          title="Search (Ctrl+K)"
          className={cn(
            "flex h-11 w-full items-center justify-center gap-3 rounded-xl border bg-background text-base text-muted-foreground transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            wide("lg:justify-start lg:px-3"),
          )}
        >
          <Search className="size-5 shrink-0" aria-hidden />
          <span className={cn("flex-1 text-left", folded ? "hidden" : "hidden lg:block")}>Search</span>
          <kbd className={cn("rounded-md border bg-muted px-1.5 py-0.5 text-xs", folded ? "hidden" : "hidden lg:block")}>Ctrl K</kbd>
        </button>
      </div>

      <nav aria-label="Main menu" className="flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4">
        {/* The current URL is request data on pages like /library/[id], so it needs <Suspense>.
            Until it is known, the menu shows with no item highlighted. */}
        <Suspense fallback={<SidebarLinks pathname={null} folded={folded} />}>
          <CurrentSidebarLinks folded={folded} />
        </Suspense>
      </nav>

      {/* Footer: icon-only log out (tablet or folded), or email + log out (large screens). */}
      <form
        action="/auth/signout"
        method="post"
        className={cn("border-t p-3", wide("lg:hidden"))}
        onSubmit={(e) => {
          const form = e.currentTarget;
          e.preventDefault();
          void clearOfflinePages().finally(() => form.submit());
        }}
      >
        <button
          type="submit"
          aria-label="Log out"
          title="Log out"
          className="flex h-11 w-full items-center justify-center rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-5" />
        </button>
      </form>
      {!folded && <div className="hidden space-y-3 border-t p-4 lg:block">{footer}</div>}
    </aside>
  );
}

function CurrentSidebarLinks({ folded }: { folded: boolean }) {
  return <SidebarLinks pathname={usePathname()} folded={folded} />;
}

function SidebarLinks({ pathname, folded }: { pathname: string | null; folded: boolean }) {
  const wide = (cls: string) => (folded ? "" : cls);
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className={cn("mx-3 mb-2 border-t", wide("lg:hidden"))} aria-hidden />
          <p className={cn("hidden px-3 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase", wide("lg:block"))}>{group.title}</p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.filter((i) => group.hrefs.includes(i.href)).map(({ href, label, icon: Icon }) => {
              const active = pathname !== null && isActive(href, pathname);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    title={label}
                    className={cn(
                      "group flex h-11 items-center justify-center gap-3 rounded-xl text-base font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      wide("lg:justify-start lg:px-3"),
                      active
                        ? "bg-primary-soft font-semibold text-primary"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon
                      className={cn("size-5 shrink-0", active ? "fill-primary/20" : "text-muted-foreground group-hover:text-sidebar-accent-foreground")}
                      aria-hidden
                    />
                    <span className={folded ? "sr-only" : "sr-only lg:not-sr-only"}>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
