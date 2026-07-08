// Simple service worker for offline fallback
var CACHE = 'vote-tablet-v1';
var URLS = ['/', '/tablet-vote.html', '/manifest.json'];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(URLS); })
    .catch(function() {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Only cache GET requests for static assets
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(r) { return r || fetch(e.request); })
    .catch(function() { return caches.match('/tablet-vote.html'); })
  );
});
