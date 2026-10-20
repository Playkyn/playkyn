// 👇 每次上线更新代码，务必把 v1.1.1 改成 v1.1.2、v1.1.3 ...
const CACHE_NAME = 'playkyn-v1.1.1';

// 👇 需要离线缓存的所有文件清单（请确保这些文件真实存在）
const PRECACHE_ASSETS = [
  // 页面基础
  './',
  './index.html',
  './user.html',
  './wordgame.html',
  './membership.js',
  
  // 核心架构与公共组件
  './game-registry.js',
  './game-access.js',
  './game-hud.js',
  './word-pool.js',

  // --- 老游戏（按需核对文件名，确保没写错）---
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

  // --- 新游戏 ---
  './game-racer.js',
  // ⚠️ 等你写好了下面两个文件，记得删掉前面的 // 符号
  // './game-shooter.js',
  // './game-maze.js'
];

// 1. 安装阶段：把清单里的文件全部下载并缓存
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('正在预缓存离线游戏资源...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting()) // 强制新 SW 立刻接管
  );
});

// 2. 激活阶段：清理旧版本缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('清理旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 拦截请求阶段：优先用缓存，断网也能秒开游戏
self.addEventListener('fetch', e => {
  // 只处理 GET 请求，避开接口的 POST 等操作
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      // 如果缓存里有（说明是静态文件），直接瞬间返回，并顺便静默发个网络请求更新它
      if (cachedResponse) {
        fetch(e.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse));
          }
        }).catch(() => { /* 断网时静默失败，不影响体验 */ });
        
        return cachedResponse;
      }

      // 如果缓存里没有（比如是新文件或 API 请求），就去网络拿，拿到了顺手存下来
      return fetch(e.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && e.request.url.match(/\.(js|css|html|png|jpg|svg|woff2)$/)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        // 网络也挂了，没有缓存，返回 404 页面或者占位
        return new Response('断网且无缓存', { status: 404 });
      });
    })
  );
});