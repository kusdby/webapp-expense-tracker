const CACHE_NAME = 'finance-shell-v2';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/icons/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png'];

const cacheResponse = (key, response) => {
  if (!response.ok) return Promise.resolve();
  return caches.open(CACHE_NAME).then((cache) => cache.put(key, response.clone()));
};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  const network = fetch(request);
  if (request.mode === 'navigate') {
    event.respondWith(network.catch(() => caches.match('/')));
    event.waitUntil(network.then((response) => cacheResponse('/', response)).catch(() => undefined));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || network));
  event.waitUntil(network.then((response) => cacheResponse(request, response)).catch(() => undefined));
});
