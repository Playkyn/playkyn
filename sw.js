const CACHE_NAME = 'playkyn-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting(); // 强制新 Service Worker 立即接管
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // 清理旧版本缓存
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // 如果请求的是 HTML 或者接口数据，直接走网络（不缓存）
  if (e.request.mode === 'navigate' || e.request.url.includes('/rest/v1') || e.request.url.includes('.html')) {
    e.respondWith(fetch(e.request));
    return;
  }
  
  // 其他静态资源（图片、CSS）可以尝试网络优先，失败再用缓存
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});