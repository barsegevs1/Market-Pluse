const CACHE_NAME = 'market-pulse-v1';
const STATIC_ASSETS = ['/', '/index.html'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', event => {
  // API calls — always network first
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});
