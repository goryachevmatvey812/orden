/* Орден: фоновые Web Push в браузере. Регистрируется со страницы index.html. */
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCd4YGfhtlEDnuWqkXCQrW4_lLwwTGEu2M",
  authDomain: "orden-carstvie.firebaseapp.com",
  projectId: "orden-carstvie",
  storageBucket: "orden-carstvie.firebasestorage.app",
  messagingSenderId: "504085056619",
  appId: "1:504085056619:web:338d1c10d4ad0c7114f52e"
});

try {
  const m = firebase.messaging();
  m.onBackgroundMessage(p => {
    const n = p.notification || {};
    const d = p.data || {};
    self.registration.showNotification(n.title || d.title || 'Орден', {
      body: n.body || d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || 'orden',
      data: { url: d.url || './' }
    });
  });
} catch (e) {}

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return clients.openWindow(go);
  }));
});