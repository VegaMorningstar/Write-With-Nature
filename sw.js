// Write with Nature — Service Worker
// Bump APP_VERSION after each deployment to bust stale caches.

const APP_VERSION  = 'v21';
const SHELL_CACHE  = `wwn-shell-${APP_VERSION}`;
const IMAGE_CACHE  = `wwn-images-${APP_VERSION}`;
const NASA_HOST    = 'assets.science.nasa.gov';

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

// ── Install ──────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== SHELL_CACHE && k !== IMAGE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NASA Landsat images and local images/: cache-first
  if (url.hostname === NASA_HOST || url.pathname.includes('/images/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(event.request).then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(res => {
              if (res && (res.status === 200 || res.type === 'opaque')) cache.put(event.request, res.clone());
              return res;
            })
            .catch(() => new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <rect width="200" height="200" fill="#ddd4b8"/>
                <text x="100" y="115" text-anchor="middle" font-size="52"
                      font-family="Georgia,serif" fill="rgba(28,26,16,0.15)">?</text>
              </svg>`,
              { headers: { 'Content-Type': 'image/svg+xml' } }
            ));
        })
      )
    );
    return;
  }

  // Fonts: network-first, fall back to cache
  if (url.hostname.includes('fonts.')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Messages ─────────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data === 'CLEAR_IMAGE_CACHE') {
    caches.delete(IMAGE_CACHE).then(() => {
      event.source.postMessage('IMAGE_CACHE_CLEARED');
    });
  }
});
