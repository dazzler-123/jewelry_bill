const CACHE_NAME = 'aurum-pos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Interceptor Event
self.addEventListener('fetch', (event) => {
  // Only handle http and https requests to avoid extension scheme caching errors
  if (!event.request.url.startsWith('http:') && !event.request.url.startsWith('https:')) {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Exclude API requests from cache
  if (requestUrl.pathname.startsWith('/api') || requestUrl.port === '3000') {
    return;
  }

  // Bypass cache for Vite dev server hot-reloads and ES modules
  if (
    requestUrl.pathname.includes('/@vite/') ||
    requestUrl.pathname.includes('/@react-refresh') ||
    requestUrl.pathname.startsWith('/src/') ||
    requestUrl.pathname.startsWith('/node_modules/') ||
    requestUrl.search.includes('v=') ||
    requestUrl.search.includes('token=')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache newly requested static assets dynamically
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback offline experience
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
