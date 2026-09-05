const CACHE='rachna-os-v20260905-40';
const CORE=['./','./index.html?v=20260905.40','./styles.css?v=20260905.40','./app.js?v=20260905.40','./manifest.webmanifest?v=20260905.40'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==self.location.origin)return;e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{const x=r.clone();caches.open(CACHE).then(k=>k.put(e.request,x)).catch(()=>{});return r})).catch(()=>caches.match('./index.html?v=20260905.40')))});
