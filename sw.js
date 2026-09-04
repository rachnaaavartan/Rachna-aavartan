const CACHE='rachna-os-v20260904-5';
const CORE=['./','./index.html?v=20260904.5','./styles.css?v=20260904.5','./os-workflow-v3.css?v=20260904.5','./backend-clean.js?v=20260904.5','./os-data-v2.js?v=20260904.5','./os-performance.js?v=20260904.5','./app.js?v=20260904.5','./os-hardening.js?v=20260904.5','./os-integrations.js?v=20260904.5','./os-qa.js?v=20260904.5','./os-production.js?v=20260904.5','./os-ux.js?v=20260904.5','./os-crew-v2.js?v=20260904.5','./os-finance-v2.js?v=20260904.5','./os-operations-v2.js?v=20260904.5','./os-crm-v2.js?v=20260904.5','./os-documents-v2.js?v=20260904.5','./os-marketing-v2.js?v=20260904.5','./os-booking-v2.js?v=20260904.5','./os-control-v3.js?v=20260904.5','./os-workflow-v3.js?v=20260904.5','./manifest.webmanifest?v=20260904.5'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  const isStatic=/\.(?:js|css|svg|webmanifest)$/i.test(url.pathname);
  if(isStatic){event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return r})).catch(()=>caches.match('./index.html')));return;}
  event.respondWith(fetch(event.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{});return r}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
