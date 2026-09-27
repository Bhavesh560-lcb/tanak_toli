// Tanak Toli service worker - ફોનમાં ઇન્સ્ટોલ, ઓફલાઇન ખોલવા અને આપોઆપ અપડેટ માટે
const CACHE = 'tanak-toli-v1.4.0';
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

  // version.json: always from the internet (used for auto update)
  if (url.origin === location.origin && url.pathname.endsWith('version.json')) return;

  // Page itself: internet first so updates arrive; saved copy when offline
  if (url.origin === location.origin && (req.mode === 'navigate' || url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }
  if (url.origin === location.origin) { e.respondWith(cacheFirst(req)); return; }
  if ((url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' ||
      (url.hostname === 'cdnjs.cloudflare.com' && url.pathname.includes('leaflet'))) {
    e.respondWith(cacheFirst(req));
  }
});
