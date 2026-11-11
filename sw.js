// Retired: this site no longer uses an offline cache. This worker clears old caches and removes itself.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach((c) => c.navigate(c.url));
  })());
});
