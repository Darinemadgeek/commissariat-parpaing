// Service worker : réseau d'abord (toujours la dernière version), cache en secours (jouable hors ligne).
const CACHE = 'parpaing-v2';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'img/titre.webp',
  'data.js', 'scene-core.js', 'scene-world.js', 'scene-world2.js', 'scene-building.js', 'scene-life.js', 'game-core.js', 'game-tips.js', 'game-ui.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon-64.png',
];
const CDN = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin, cdn = CDN.includes(url.hostname);
  if (!mine && !cdn) return;
  e.respondWith(
    fetch(req).then((res) => {
      // Three.js et les polices viennent d'un CDN : on les garde aussi pour jouer hors ligne
      if (res.ok || (cdn && res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (mine ? caches.match('index.html') : undefined)))
  );
});
