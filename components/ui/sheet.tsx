"use client";

import { Drawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One component, two looks:
 * - phone: a bottom sheet that slides up (swipe down to close)
 * - laptop: a centered dialog
 * Same content in both. Use `open`/`onOpenChange` to control it, or pass a `trigger`.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** A button element that opens the sheet. */
  trigger?: ReactElement;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Buttons at the bottom (e.g. one main action). */
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange ? (o) => onOpenChange(o) : undefined}>
      {trigger && <Drawer.Trigger render={trigger} />}
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(0.35*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[400ms] ease-(--ease-sheet) data-ending-style:opacity-0 data-starting-style:opacity-0 data-swiping:duration-0 dark:opacity-[calc(0.65*(1-var(--drawer-swipe-progress)))] supports-[-webkit-touch-callout:none]:absolute" />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <Drawer.Popup
            className={cn(
              // Phone: bottom sheet (the extra 3rem "bleed" hides the gap while it springs).
              "-mb-12 flex max-h-[calc(88dvh+3rem)] w-full flex-col overflow-hidden rounded-t-sheet bg-popover pb-12 text-popover-foreground shadow-lift outline-none",
              "[transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[400ms] ease-(--ease-sheet) data-swiping:select-none",
              "data-ending-style:[transform:translateY(calc(100%-3rem+2px))] data-starting-style:[transform:translateY(calc(100%-3rem+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
              // Laptop: centered dialog.
              "md:mb-0 md:max-h-[85dvh] md:max-w-lg md:rounded-sheet md:pb-0 md:data-ending-style:[transform:translateY(24px)] md:data-ending-style:opacity-0 md:data-starting-style:[transform:translateY(24px)] md:data-starting-style:opacity-0 md:transition-[transform,opacity]",
              className,
            )}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30 md:hidden" aria-hidden />
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2 md:px-6 md:pt-6">
              <div className="min-w-0">
                <Drawer.Title className="text-xl font-bold">{title}</Drawer.Title>
                {description && <Drawer.Description className="mt-1 text-base text-muted-foreground">{description}</Drawer.Description>}
              </div>
              <Drawer.Close
                aria-label="Close"
                className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-5" />
              </Drawer.Close>
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6">
              {children}
            </Drawer.Content>
            {footer && <div className="border-t px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6 md:pb-5">{footer}</div>}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
