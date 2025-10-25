/// <reference lib="webworker" />

/**
 * Lunax Service Worker (Workbox injectManifest)
 * - Förcache: buildade assets (via __WB_MANIFEST)
 * - Cache-strategier: fonter/ikoner, bilder, CDN
 * - SPA/offline: fallback sätts i vite.config.ts (navigateFallback: "index.html")
 */

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setDefaultHandler } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// Undvik TS-krockar: använd befintliga globala self och läs __WB_MANIFEST via any
const sw = self as unknown as ServiceWorkerGlobalScope;

// Precacha Vite-assets som Workbox injicerar
// (vite-plugin-pwa fyller in self.__WB_MANIFEST vid build)
precacheAndRoute(((self as any).__WB_MANIFEST ?? []) as any[]);

clientsClaim();
cleanupOutdatedCaches();

/** Standard: SWR som default för statiska fetches */
setDefaultHandler(
  new StaleWhileRevalidate({
    cacheName: "lunax-default",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
  })
);

/** Google Fonts: CSS → SWR */
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({
    cacheName: "lunax-google-fonts-styles",
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
  })
);

/** Google Fonts: binärer → CacheFirst */
registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "lunax-google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 })
    ]
  })
);

/** Bilder (inkl. app-ikoner) → CacheFirst */
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "lunax-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })
    ]
  })
);

/** Ikonvägar – använd inkluderingscheck så det funkar under Pages-subpath */
registerRoute(
  ({ url }) => url.pathname.includes("/icons/"),
  new CacheFirst({
    cacheName: "lunax-static-icons",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 })
    ]
  })
);

/** SPA-navigation → NetworkFirst (med snabb timeout) */
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "lunax-pages",
    networkTimeoutSeconds: 3,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
  })
);

/** CDN-script/styles → SWR */
registerRoute(
  ({ request, url }) =>
    (request.destination === "script" || request.destination === "style") &&
    url.origin !== sw.location.origin,
  new StaleWhileRevalidate({
    cacheName: "lunax-cdn-assets",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 })
    ]
  })
);

/** Uppdateringsflöde (skipWaiting) */
sw.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = (event?.data ?? {}) as { type?: string };
  if (data?.type === "SKIP_WAITING") sw.skipWaiting();
});

// Inget default-export i en SW-fil
export {};