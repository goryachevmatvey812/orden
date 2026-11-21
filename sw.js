const C='OrdenShell-__V__';
const F=['index.html','version.txt','manifest.json','site/index.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F).catch(()=>{})).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request;
 if(r.method!=='GET')return;
 const u=new URL(r.url);
 if(u.hostname.endsWith('googleapis.com')||u.hostname.endsWith('gstatic.com')||u.hostname.endsWith('google.com'))return;
 e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(C).then(x=>x.put(r,c).catch(()=>{}));return res}).catch(()=>caches.match(r).then(m=>m||caches.match('index.html'))))
});