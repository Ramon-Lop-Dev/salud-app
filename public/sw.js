const CACHE_NAME = 'mi-salud-shell-v2';
const PRECACHE_ASSETS = [];
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/icon.svg', ...PRECACHE_ASSETS];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('mi-salud-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 80) : 'Recordatorio de Mi Salud';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 180) : 'Tienes un recordatorio pendiente.';
  const target = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/#/home';
  event.waitUntil(self.registration.showNotification(title, {
    body, icon: '/icons/icon.svg', badge: '/icons/icon.svg', tag: 'mi-salud-reminder',
    renotify: false, data: { target },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.target || '/#/home';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const sameOrigin = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (sameOrigin) {
      sameOrigin.navigate(new URL(target, self.location.origin).href);
      return sameOrigin.focus();
    }
    return self.clients.openWindow(new URL(target, self.location.origin).href);
  }));
});
