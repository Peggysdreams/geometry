// 為歡幾何 - Service Worker
// 只快取同網域的核心檔案（頁面本身、manifest、圖示），
// 外部資源（Google 字型、JSZip CDN、Google API）一律交給瀏覽器直接處理，
// 避免 service worker 介入外部網域造成快取或憑證問題。
const CACHE_NAME = 'weihuan-jihe-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((err) => console.warn('SW install 快取失敗：', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 外部資源不攔截

  // 網路優先，抓得到就順便更新快取；離線或抓不到時退回快取，
  // 導覽（開啟頁面本身）失敗時再退回快取的 index.html。
  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
