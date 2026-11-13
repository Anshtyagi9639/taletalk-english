"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearOfflinePages } from "./sw-register";

/**
 * Logs out by posting to /auth/signout (works without JavaScript).
 * With JavaScript it first forgets the pages saved for offline reading.
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form
      action="/auth/signout"
      method="post"
      className={className}
      onSubmit={(e) => {
        const form = e.currentTarget;
        e.preventDefault();
        void clearOfflinePages().finally(() => form.submit());
      }}
    >
      <Button type="submit" variant="outline" className="h-11 w-full justify-start gap-3 text-base">
        <LogOut className="size-5" aria-hidden />
        Log out
      </Button>
    </form>
  );
}
