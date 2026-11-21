/* Орден: сервис-воркер сайта и приложения.
   Стратегия: сеть → кэш (обновления приходят сразу при наличии связи, без связи — сохранённая копия). */
const C = 'orden-v4';
const BASE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(BASE).catch(() => {})).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const h = u.hostname;
  if (u.search.includes('ping=1')) return;
  if (h.includes('firestore.googleapis.com') || h.includes('identitytoolkit')
      || h.includes('securetoken') || h.includes('gstatic.com') || h.includes('googleapis.com')) return;
  if (!/^https?:$/.test(u.protocol)) return;
  e.respondWith(
    fetch(r).then(res => {
      const cp = res.clone();
      caches.open(C).then(c => c.put(r, cp).catch(() => {}));
      return res;
    }).catch(() => caches.match(r).then(m => m || caches.match('index.html')))
  );
});

/* Push, приходящий с сервера (Cloud Functions + Web Push) */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'Орден', body: e.data ? e.data.text() : '' }; }
  const title = d.title || 'Орден';
  const opts = {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'orden',
    renotify: true,
    data: { url: d.url || './' }
  };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow(go);
  }));
});