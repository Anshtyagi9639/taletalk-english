"use client";

import { Button } from "@/components/ui/button";

/** Friendly message when a page has an error (never show raw errors). */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Oops, something went wrong.</h1>
      <p className="mt-2 text-muted-foreground">Please try again. If it keeps happening, reload the page.</p>
      <Button onClick={reset} size="lg" className="mt-6 h-11 px-6 text-base">
        Try again
      </Button>
    </div>
  );
}
