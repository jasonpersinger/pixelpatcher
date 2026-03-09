const CACHE_NAME = 'pp-shell-v1';
const SHELL_ASSETS = [
  '/PIXELPATCHER-Accounting.html',
  '/manifest.json',
  '/logoblack_gold.png',
  '/pixelpatcher_header_chunky.png',
  '/pixelpatcherLOGO.png',
  '/icon-192.png',
  '/icon-512.png',
];

// Network-only hosts — never cache Firebase/Google API calls
const NETWORK_ONLY = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebasestorage.googleapis.com',
  'firebase.googleapis.com',
  'gstatic.com',
  'googleapis.com',
  'googletagmanager.com',
  'fonts.googleapis.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network for Firebase and Google APIs
  if (NETWORK_ONLY.some(host => url.hostname.includes(host))) {
    return; // default browser fetch
  }

  // Cache-first for same-origin shell assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
