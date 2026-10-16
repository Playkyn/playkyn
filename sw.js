const CACHE_NAME = 'playkyn-v1.1.0'; // 👈 每次上线，就把这个数字加1，比如 v1.0.9

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName); // 删掉所有老版本缓存
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // 网络优先：只要网速正常，永远加载最新文件
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});