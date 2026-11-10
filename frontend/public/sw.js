/*
 * Service worker of Exercise Counter (registered in production builds only, see src/main.ts).
 *
 * - API calls (/api/**) and non-GET requests are never cached: data always comes from the server.
 * - Pages (navigations): network first, cached copy when offline – so the app starts without a
 *   connection and shows its own "server not reachable" states instead of a browser error page.
 * - /assets/** (content-hashed build files, Shoelace icons): cache first – they never change.
 * - Other static files (manifest, app icons): served from cache, refreshed in the background.
 *
 * Bump CACHE_VERSION to drop all caches of older versions.
 */
const CACHE_VERSION = "v2";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const SHELL_URL = "/";
/** Needed offline although never loaded online before (the "server not reachable" screen). */
const OFFLINE_ICONS = ["/assets/icons/wifi-off.svg"];

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline – Exercise Counter</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:system-ui,sans-serif;
background:#f9f9f9;color:#18181b;text-align:center}@media(prefers-color-scheme:dark){body{background:#1a1a1e;color:#f4f4f5}}
button{margin-top:1rem;padding:.6rem 1.2rem;border:0;border-radius:8px;background:#0284c7;color:#fff;font:inherit}</style>
</head><body><div><h1>You are offline</h1><p>Exercise Counter needs a connection to load for the first time.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then(cache => cache.addAll([SHELL_URL, ...OFFLINE_ICONS]))
            .catch(() => undefined) // offline during install: the shell is cached on the next visit
            .then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
    const current = [SHELL_CACHE, ASSET_CACHE, STATIC_CACHE];
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => !current.includes(key)).map(key => caches.delete(key))))
            .then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
        return; // network only
    }
    if (request.mode === "navigate") {
        event.respondWith(networkFirstPage(request));
    } else if (url.pathname.startsWith("/assets/")) {
        event.respondWith(cacheFirst(request));
    } else {
        event.respondWith(staleWhileRevalidate(request));
    }
});

/** The app is a single page: every route is answered with the (cached) shell when offline. */
async function networkFirstPage(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) {
            await cache.put(SHELL_URL, response.clone());
        }
        return response;
    } catch {
        return (await cache.match(SHELL_URL))
            ?? new Response(OFFLINE_PAGE, {status: 503, headers: {"Content-Type": "text/html; charset=utf-8"}});
    }
}

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) {
        return cached;
    }
    const response = await fetch(request);
    if (response.ok) {
        const cache = await caches.open(ASSET_CACHE);
        await cache.put(request, response.clone());
    }
    return response;
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    const network = fetch(request)
        .then(response => {
            if (response.ok) {
                void cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);
    return cached ?? network;
}
