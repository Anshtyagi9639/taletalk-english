"use client";

import { useEffect } from "react";

/**
 * Registers the offline helper (public/sw.js) — only in the real app (production),
 * because in development it would keep old files and confuse hot reload.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => console.warn("Offline helper not registered:", err));
  }, []);
  return null;
}

/** Forgets the pages saved for offline (used on log out, so the next person sees nothing). */
export async function clearOfflinePages() {
  try {
    if ("caches" in window) await caches.delete("taletalk-pages");
    navigator.serviceWorker?.controller?.postMessage({ type: "clear" });
  } catch {
    // nothing saved, or storage blocked
  }
}
