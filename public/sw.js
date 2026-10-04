/* Vyas — service worker.
   Only public reading pages are ever cached. Account, community, auth and API routes are never
   touched, so nothing personal can be stored or replayed from the cache.
   Pages: network-first (a deploy shows up on the next load), cached copy when offline.
   Hashed build assets: cache-first. Everything cross-origin is left to the browser (the site CSP
   does not allow the worker to fetch other origins). Bump VERSION to invalidate all caches. */
const VERSION = "v3";
const SHELL = `shell-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const MAX_PAGES = 40;
const MAX_ASSETS = 80;

const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
  "/vd-logo.png",
];

// Reading surfaces that are identical for every visitor.
const PUBLIC_PAGE =
  /^\/(?:$|blog(?:\/|$)|topics(?:\/|$)|about\/?$|projects\/?$|search\/?$)/;
const NEVER =
  /^\/(?:api|auth|login|signup|settings|admin|moderation|notifications|verify-email|forgot-password|discussions|u)(?:\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      await cache.addAll(
        PRECACHE.map((u) => new Request(u, { cache: "reload" })),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, PAGES, ASSETS]);
      for (const key of await caches.keys())
        if (!keep.has(key)) await caches.delete(key);
      if (self.registration.navigationPreload)
        await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

const trim = async (name, max) => {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i += 1) await cache.delete(keys[i]);
};

const cacheable = (res) => {
  if (!res || res.status !== 200 || res.type !== "basic") return false;
  const cc = (res.headers.get("cache-control") || "").toLowerCase();
  return !/no-store|private/.test(cc) && !res.headers.has("set-cookie");
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  const personal = NEVER.test(url.pathname);

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const res = (await event.preloadResponse) || (await fetch(request));
          if (!personal && PUBLIC_PAGE.test(url.pathname) && cacheable(res)) {
            const copy = res.clone();
            event.waitUntil(
              (async () => {
                const cache = await caches.open(PAGES);
                await cache.put(request, copy);
                await trim(PAGES, MAX_PAGES);
              })(),
            );
          }
          return res;
        } catch {
          const cached =
            !personal && PUBLIC_PAGE.test(url.pathname)
              ? await caches.match(request)
              : undefined;
          return cached || (await caches.match("/offline")) || Response.error();
        }
      })(),
    );
    return;
  }

  // API calls and other account traffic are never intercepted.
  if (personal) return;

  // Hashed, immutable build output.
  if (
    url.pathname.startsWith("/_astro/") ||
    /\.(?:woff2?|png|jpe?g|webp|avif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const hit = await caches.match(request); // any cache: precached icons live in the shell cache
        if (hit) return hit;
        const res = await fetch(request);
        if (cacheable(res)) {
          cache.put(request, res.clone());
          event.waitUntil(trim(ASSETS, MAX_ASSETS));
        }
        return res;
      })(),
    );
  }
  // Everything else (posts.json, rss.xml, scripts) goes straight to the network.
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
