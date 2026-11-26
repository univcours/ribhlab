/* Local shell only: AI models and uploaded media never cached by this worker. */
const CACHE='rivocaption-shell-v040';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./favicon.svg','./manifest.webmanifest'])))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||/ffmpeg-core/.test(url.pathname))return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});