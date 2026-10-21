const CACHE_NAME = 'playkyn-v1.2.0'; // 👈 必须修改版本号！

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './user.html',
  './wordgame.html',
  './membership.js',
  './game-registry.js',
  './game-hud.js',
  './word-pool.js',
  './game-runner.js',
  './game-guardian.js',
  './game-ai.js',
  './game-listen.js',
  './game-match.js',
  './game-sheep.js',
  './game-minecraft.js',
  './game-scenario.js',
  './game-whack.js',
  './game-flashmatch.js',
  './game-racer.js',
  './game-shooter.js',
  './game-maze.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // 只处理 GET 请求
  if (e.request.method !== 'GET') return;
  // 忽略非 http/https 请求（比如浏览器插件请求）
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // 如果缓存里有（比如 JS、CSS、HTML），瞬间返回缓存，同时静默去后台拉最新版
      if (cachedResponse) {
        fetch(e.request).then(networkResponse => {
          // 🚨 核心修复：只有状态码为 200 且不是重定向的响应，才能放入缓存！
          if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
          }
        }).catch(() => {}); // 断网静默失败
        return cachedResponse;
      }

      // 缓存没有，直接去网络拿
      return fetch(e.request).then(networkResponse => {
        // 🚨 核心修复：一样要判断 redirected，重定向直接返回，千万别试图缓存
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.redirected) {
          return networkResponse;
        }
        
        // 如果是静态文件，顺手存下来
        if (e.request.url.match(/\.(js|css|html|png|jpg|svg|woff2|json)$/)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(e.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 断网且没缓存，返回 404
        return new Response('Offline', { status: 404 });
      });
    })
  );
});