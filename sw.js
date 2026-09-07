// Simple service worker for offline fallback
// [修复] HTML 页面改为 Network-First（优先取最新版本），仅离线时回退缓存
// [修复] 升级缓存版本号，强制清除旧缓存
var CACHE = 'vote-tablet-v2';
var HTML_PAGES = ['/tablet-vote.html', '/', '/pdf-view.html', '/index.html'];
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
  if (e.request.method !== 'GET') return;
  var url = e.request.url;

  // HTML 页面：Network-First —— 每次优先从服务器取最新页面，离线才用缓存
  var isHtml = HTML_PAGES.some(function(p) { return url.indexOf(p) !== -1; }) ||
               (e.request.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          return resp;
        })
        .catch(function() { return caches.match(e.request).then(function(r) { return r || caches.match('/tablet-vote.html'); }); })
    );
    return;
  }

  // 其他静态资源（css/js/图标）：Cache-First，后台无更新需求
  e.respondWith(
    caches.match(e.request).then(function(r) { return r || fetch(e.request); })
    .catch(function() { return caches.match('/tablet-vote.html'); })
  );
});
