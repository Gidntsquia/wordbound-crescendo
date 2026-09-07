// public/sw.js
// Offline audio cache (NEXT_LEVEL_PLAN.md stage 5). The seven fetched-only
// recordings (public/audio/*.mp3, gitignored -- see CLAUDE.md's audio
// section) are not part of the app bundle; without this, a phone with no
// signal on a later visit gets a silent run. Cache-first, network fallback:
// the FIRST time a piece plays it comes from the network and gets cached;
// every time after that (offline included) it comes from the cache. Nothing
// else is cached --
// index.html and the hashed JS/CSS bundle are small and change on every
// deploy, and stale-serving THOSE would ship an old build silently.
const CACHE = 'wbc-audio-v1';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!/\/audio\//.test(url.pathname) || !/\.mp3$/i.test(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    try {
      const resp = await fetch(event.request);
      if (resp && resp.ok) cache.put(event.request, resp.clone());
      return resp;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
