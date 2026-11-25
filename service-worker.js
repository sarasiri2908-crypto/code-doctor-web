const CACHE='code-doctor-v4-20261125';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./doctor-v4.js','./python-check.js','./acorn.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('code-doctor-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 const url=new URL(e.request.url);
 if(!ASSETS.some(a=>new URL(a,self.registration.scope).pathname===url.pathname))return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}return r;}).catch(async()=>await caches.match(e.request)|| (e.request.mode==='navigate'?await caches.match('./index.html'):undefined)||Response.error()));
});
