const CACHE='ndne-v1.9.0';
const STATIC=['./','./index.html','./dados.json','./fontes.json','./manifest.webmanifest','./metodologia.html','./api-docs.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ndne-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.pathname.startsWith('/api/'))return; // CDN owns API cache; never substitute HTML or silently stale data.
 e.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  try{
   const r=await fetch(e.request);
   if(r.ok&&STATIC.some(p=>new URL(p,self.location.href).pathname===u.pathname))await cache.put(e.request,r.clone());
   return r;
  }catch{
   const cached=await cache.match(e.request);if(cached)return cached;
   if(e.request.mode==='navigate')return (await cache.match('./index.html'))||new Response('Portal indisponível offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
   return new Response('Recurso indisponível offline.',{status:503});
  }
 })());
});
