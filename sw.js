// Service worker de la Botifarra: permet jugar sense connexió.
// Quan canviïs el joc, puja el número de VERSION perquè els usuaris rebin l'actualització.
const VERSION = 'botifarra-v12';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);

  // Pàgina: xarxa primer (per veure actualitzacions), cache si no hi ha connexió.
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(VERSION).then(c=>c.put('./index.html', copy));
        return res;
      }).catch(()=>caches.match('./index.html'))
    );
    return;
  }

  // Tipografies de Google: cache i actualitza en segon pla.
  if(url.hostname==='fonts.googleapis.com' || url.hostname==='fonts.gstatic.com'){
    e.respondWith(
      caches.open(VERSION).then(c=>c.match(req).then(hit=>{
        const net = fetch(req).then(res=>{ c.put(req, res.clone()); return res; }).catch(()=>hit);
        return hit || net;
      }))
    );
    return;
  }

  // La resta de fitxers propis: cache primer.
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(hit=>hit || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(VERSION).then(c=>c.put(req, copy));
      return res;
    })));
  }
});
