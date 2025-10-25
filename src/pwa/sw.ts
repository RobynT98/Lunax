/// <reference lib="webworker" />

/**
 * Lunax Service Worker (Workbox injectManifest)
 * - Förcache: app-skal (buildade assets)
 * - Cache-strategier: fonter/ikoner, bilder, tredjepart (Google Fonts)
 * - Offline: SPA-navigation hanteras via navigateFallback i vite.config.ts
 */

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setDefaultHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// @ts-expect-error: Självgenereras av vite-plugin-pwa vid build
declare let self: ServiceWorkerGlobalScope;
// @ts-expect-error: Fylls av Workbox med buildade filer
declare const self.__WB_MANIFEST: any[];

clientsClaim();

// Förcachea Vite-assets (injektas vid build)
precacheAndRoute(self.__WB_MANIFEST || []);

// Städar bort gamla workbox-cachar som inte längre används
cleanupOutdatedCaches();

/**
 * Standardhandler (fallback) – NetworkFirst för html (om någon ändå smiter igenom),
 * annars StaleWhileRevalidate.
 */
setDefaultHandler(
  new StaleWhileRevalidate({
    cacheName: "lunax-default",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);

// Google Fonts: stylesheet → SWR (snabb visning, uppdatera i bakgrunden)
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "lunax-google-fonts-styles",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);

// Google Fonts: fontfiler → CacheFirst (de ändras sällan)
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "lunax-google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 år
      })
    ]
  })
);

// Bilder (inkl. appens ikoner) → CacheFirst med expiration
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "lunax-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 dagar
      })
    ]
  })
);

// Ikoner/favicons (om någon laddas via /icons/)
registerRoute(
  ({ url }) => url.pathname.startsWith("/icons/"),
  new CacheFirst({
    cacheName: "lunax-static-icons",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 365
      })
    ]
  })
);

// HTML-navigation (säkerhetsnät) → NetworkFirst
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "lunax-pages",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] })
    ]
  })
);

// Statiska CSS/JS från CDN → SWR
registerRoute(
  ({ request, url }) =>
    (request.destination === "script" || request.destination === "style") &&
    (url.origin !== self.location.origin),
  new StaleWhileRevalidate({
    cacheName: "lunax-cdn-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 7 // 7 dagar
      })
    ]
  })
);

// Hantera uppdateringsflöde från klient (skipWaiting)
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = (event?.data ?? {}) as { type?: string };
  if (data && data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// (Valfritt) Push-notiser kan läggas till här i framtiden
// self.addEventListener('push', (event) => { ... });

export {};