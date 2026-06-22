// ─── ARVR Furniture Visualizer — Service Worker ────────────────────────────
const CACHE_NAME = 'arvr-v1';

// ─── Install: precache the app shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Precache the main entry point. All other assets will be fetched
      // on demand and cached at runtime via the fetch handler.
      return cache.addAll(['/']).catch((err) => {
        console.warn('[SW] Precache failed for /, continuing…', err);
      });
    }),
  );
  // Activate immediately — don't wait for page reload
  self.skipWaiting();
});

// ─── Activate: clean up old caches ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      ),
    ),
  );
  // Claim all clients so the SW controls them immediately
  self.clients.claim();
});

// ─── Fetch: network-first for HTML, cache-first for static assets ──────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  const isHTML =
    request.headers.get('Accept')?.includes('text/html') ?? false;

  if (isHTML) {
    // Network-first for HTML (index.html, etc.)
    event.respondWith(networkFirst(request));
  } else {
    // Cache-first for static assets (JS, CSS, images, SVGs, models)
    event.respondWith(cacheFirst(request));
  }
});

// ─── Strategies ─────────────────────────────────────────────────────────────

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Cache a copy of the response for offline use
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    // Offline — fall back to cache
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: return a simple offline page
    return new Response(
      '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Offline</title><style>body{background:#121212;color:#e0e0e0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;padding:1rem;}</style></head><body><div><h1>You\'re offline</h1><p>Please check your connection and try again.</p></div></body></html>',
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Only cache valid responses
    if (response.ok || response.type === 'opaqueredirect') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // If the asset isn't in cache and we're offline, return a 404-style blob
    return new Response(null, { status: 404, statusText: 'Not Found' });
  }
}
