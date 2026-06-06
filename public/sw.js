// Kill-switch for the old vite-plugin-pwa app-shell service worker.
// Returning browsers still have the old /sw.js registered; this replacement
// activates, clears its own Workbox caches, unregisters itself, and reloads
// open tabs so users stop getting stale HTML or endless loading.

function isOldWorkboxCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)google-fonts-cache|(^|-)gstatic-fonts-cache/.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const toDelete = cacheNames.filter(isOldWorkboxCache);
        await Promise.allSettled(toDelete.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(windowClients.map((c) => c.navigate(c.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);

// Swallow any push events the old SW might still receive while it cleans up.
self.addEventListener("fetch", () => {});
