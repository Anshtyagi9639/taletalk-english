/*
 * TaleTalk service worker — makes the app work offline for what you already opened.
 * - App files (/_next/static): cache first (they never change; names have a hash).
 * - Pages: network first; if offline, the last saved copy; else the /offline page.
 *   Reader chapters you opened (or saved with "Save for offline") open without internet.
 * - API calls, AI, login and uploads are never cached.
 * Voice audio is saved by the app itself (IndexedDB), the voice model by the browser's cache.
 */
const VERSION = "v1";
const STATIC = `taletalk-static-${VERSION}`;
const PAGES = "taletalk-pages"; // kept across versions (your offline books); cleared on log out
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE_URL, "/icon-192.png", "/manifest.webmanifest"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("taletalk-static-") && k !== STATIC).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Pages we never keep (they change all the time or are about login). */
function isPrivateOrLive(url) {
  return url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/") || url.pathname.startsWith("/login");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // App files: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Full page loads: network first, then the saved copy, then the offline page.
  if (req.mode === "navigate" && !isPrivateOrLive(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Only keep real pages (not redirects to /login).
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname, { cacheName: PAGES })) || (await caches.match(OFFLINE_URL)) || Response.error()),
    );
  }
});

// Log out: forget all saved pages. ("Save for offline" writes into the same cache from the page.)
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "clear") {
    event.waitUntil(caches.delete(PAGES));
  }
});
