const C = 'trip-v2', WAIT = 2500;
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(['./', 'manifest.webmanifest'].map(u => new Request(u, { cache: 'reload' }))))); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  const mine = u.origin === location.origin, font = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (!mine && !font) return;
  const page = e.request.mode === 'navigate', key = page ? './' : e.request;
  const saved = () => caches.match(key, { ignoreSearch: true });
  const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(C).then(x => x.put(key, c)); } return r; });
  e.waitUntil(net.catch(() => {}));
  e.respondWith(new Promise(done => {
    let settled = false;
    const useSaved = () => { if (settled) return; saved().then(s => { if (settled) return; if (s) { settled = true; done(s); } }); };
    const t = setTimeout(useSaved, WAIT);
    net.then(r => { clearTimeout(t); if (!settled) { settled = true; done(r); } }, err => {
      clearTimeout(t);
      saved().then(s => { if (!settled) { settled = true; done(s || Response.error()); } });
    });
  }));
});
