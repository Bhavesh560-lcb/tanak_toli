// Tanak Toli service worker - એપને ફોનમાં ઇન્સ્ટોલ અને ઓફલાઇન ખોલવા માટે
const CACHE = 'tanak-toli-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './favicon.png', './logo.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
    }
    return res;
  }));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page itself: always try the internet first so updates arrive; fall back to the saved copy offline
  if (url.origin === location.origin && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  // Icons, manifest
  if (url.origin === location.origin) { e.respondWith(cacheFirst(req)); return; }
  // Firebase library and fonts (not the database itself)
  if ((url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheFirst(req));
  }
});
