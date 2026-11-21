/* Орден: серверные Web Push для закрытого сайта и приложения.
   Firebase Cloud Functions v2, Node 20, регион europe-west1.
   Токены хранит сайт: pushtok/{uid}.list = [{t: JSON.stringify(PushSubscription), d: deviceId, ts}]
   VAPID-ключ: в environment переменной VAPID (или секрете). Формат: {"public":"...","private":"..."}
*/
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const webpush = require('web-push');

admin.initializeApp();
setGlobalOptions({ region: 'europe-west1', maxInstances: 5 });
const db = admin.firestore();
const OWNER_EMAIL = 'goryachevmatvey812@gmail.com';

let VAPID = null;
try {
  const raw = process.env.VAPID || '';
  VAPID = raw ? JSON.parse(raw) : null;
  if (VAPID && VAPID.public && VAPID.private) {
    webpush.setVapidDetails('mailto:' + OWNER_EMAIL, VAPID.public, VAPID.private);
  } else { VAPID = null; }
} catch (e) { VAPID = null; }

const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

async function nm(uid) {
  try { const d = await db.collection('members').doc(uid).get(); return (d.exists && d.data().name) || 'Участник'; }
  catch (e) { return 'Участник'; }
}

async function parseEp(str) {
  try { const j = JSON.parse(str); return j && j.endpoint ? j : null; } catch (e) { return null; }
}

async function tokensOf(uids) {
  const out = [];
  for (const ch of chunk(uids, 10)) {
    const s = await db.collection('pushtok').where(admin.firestore.FieldPath.documentId(), 'in', ch).get();
    s.forEach(d => {
      const x = d.data();
      (x.list || []).forEach(e => { if (e && e.t) out.push({ raw: e.t, sub: e.t, uid: d.id }); });
    });
  }
  return out;
}

async function dropBad(uid, raw) {
  try {
    await db.collection('pushtok').doc(uid).update({ list: admin.firestore.FieldValue.arrayRemove(
      admin.firestore.FieldValue.list ? null : null) }).catch(() => {});
  } catch (e) {}
  // arrayRemove для объекта требует точного совпадения; читаем и фильтруем
  try {
    const d = await db.collection('pushtok').doc(uid).get();
    if (!d.exists) return;
    const list = (d.data().list || []).filter(x => x.t !== raw);
    await db.collection('pushtok').doc(uid).set({ list }, { merge: true });
  } catch (e) {}
}

async function push(uids, title, body, url, tag, high) {
  uids = [...new Set(uids)].filter(Boolean);
  if (!uids.length || !VAPID) return;
  const toks = await tokensOf(uids);
  if (!toks.length) return;
  const payload = JSON.stringify({
    title, body: String(body || '').slice(0, 140),
    url: url || './', tag: tag || 'orden', high: !!high
  });
  for (const t of toks) {
    const sub = await parseEp(t.sub);
    if (!sub) continue;
    try {
      await webpush.sendNotification(sub, payload, { urgency: high ? 'high' : 'normal', TTL: high ? 60 : 3600 });
    } catch (e) {
      const code = e && e.statusCode;
      if (code === 404 || code === 410) await dropBad(t.uid, t.raw);
    }
  }
}

// Упоминания в общем чате (люди, роли, @все). Имена полей как в сайте: x, by, men.
exports.onChat = onDocumentCreated('chat/{id}', async ev => {
  const d = ev.data && ev.data.data();
  if (!d || !d.men || !d.men.length) return;
  const name = await nm(d.by);
  let to = [];
  for (const m of d.men) {
    if (m === '*') { const s = await db.collection('members').limit(500).get(); s.forEach(x => to.push(x.id)); }
    else if (String(m).startsWith('r:')) {
      const s = await db.collection('roles').where('rids', 'array-contains', String(m).slice(2)).get();
      s.forEach(x => to.push(x.id));
    } else to.push(m);
  }
  to = to.filter(u => u !== d.by);
  await push(to, '🔔 ' + name, d.x || '🎤', './#chat', 'men-' + d.by);
});

// Личные сообщения
exports.onDm = onDocumentCreated('dms/{pair}/msgs/{id}', async ev => {
  const d = ev.data && ev.data.data();
  if (!d || d.sys) return;
  const [a, b] = ev.params.pair.split('_');
  const to = d.by === a ? b : a;
  const name = await nm(d.by);
  await push([to], '✉ ' + name, d.x || '🎤', './#chat', 'dm-' + d.by);
});

// Входящий звонок: в документ calls добавлен offer
exports.onCall = onDocumentUpdated('calls/{id}', async ev => {
  const before = ev.data.before.data(), after = ev.data.after.data();
  if (!after || before.offer || !after.offer || after.state !== 'ringing') return;
  const name = await nm(after.from);
  await push([after.to], '📞 Входящий звонок', name, './#chat', 'call', true);
});

// Жалоба: владелец + роли с правом «Читать жалобы»
exports.onReport = onDocumentCreated('reports/{id}', async ev => {
  const d = ev.data && ev.data.data();
  if (!d) return;
  const to = [];
  try { const u = await admin.auth().getUserByEmail(OWNER_EMAIL); to.push(u.uid); } catch (e) {}
  const s = await db.collection('roles').where('perms.reports', '==', true).get();
  s.forEach(x => to.push(x.id));
  const who = await nm(d.by);
  const target = d.target ? await nm(d.target) : '';
  await push(to.filter(u => u !== d.by), '🚩 Жалоба', who + (target ? ' → ' + target : ''), './#rep', 'rep');
});

// Новая новость: всем, у кого включены оповещения
exports.onNews = onDocumentCreated('news/{id}', async ev => {
  const d = ev.data && ev.data.data();
  if (!d || !d.t) return;
  const s = await db.collection('members').limit(500).get();
  const to = []; s.forEach(x => to.push(x.id));
  await push(to, '📰 ' + String(d.t).slice(0, 60), d.x || '', './#home', 'news', false);
});
