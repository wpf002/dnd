/**
 * Lantern's service worker.
 *
 * What this buys, honestly: the app opens with no network, the library and the
 * art are readable, and a session in progress shows the beat it was on. What
 * it does not buy is taking a turn — every mechanical outcome is computed by
 * the engine on the server and persisted before the client sees it, and that
 * invariant is the whole product. Playing offline means moving the engine into
 * the browser, which is a change of architecture rather than a cache.
 *
 * So: cache what can be served from a cache, and let the writes fail cleanly
 * enough that the app can say "you are offline" instead of showing a stack
 * trace.
 *
 * Three strategies, by what the request is:
 *
 *   - Navigation      network first, cache second, shell last. A fresh build
 *                     should win when there is a network; something should
 *                     render when there is not.
 *   - Static assets   cache first. Next's build output is content-hashed and
 *                     art never changes under a given name, so a hit is always
 *                     correct and a miss just costs a fetch.
 *   - API reads       network first, cache second. Reading the adventure list
 *                     or the current beat offline is worth the staleness.
 *   - API writes      network only. A turn that did not reach the engine did
 *                     not happen, and pretending otherwise would put the
 *                     client's idea of the game ahead of the server's.
 */

const VERSION = 'lantern-v1';
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const DATA = `${VERSION}-data`;
const CURRENT = new Set([SHELL, ASSETS, DATA]);

const SHELL_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([SHELL_URL, '/manifest.webmanifest']))
      // A failed precache must not leave the previous worker in place with a
      // half-installed replacement behind it.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !CURRENT.has(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

/** Long-lived, content-addressed, or otherwise safe to serve from a cache. */
function isAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/art/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.webmanifest'
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, fallback) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (fallback) {
      const shell = await caches.open(SHELL);
      const shellHit = await shell.match(fallback);
      if (shellHit) return shellHit;
    }
    throw err;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // Writes go to the network or nowhere.

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, SHELL_URL));
    return;
  }

  if (url.origin === self.location.origin && isAsset(url)) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  // Everything else that is a GET — the API's adventure list, a campaign's
  // progress, the beat a session is on — is read through the cache so it is
  // still there with the network off.
  event.respondWith(networkFirst(request, DATA));
});
