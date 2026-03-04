self.addEventListener('install', (e) => {
    e.waitUntil(
      caches.open('veltus-store').then((cache) => cache.addAll([
        '/index.html',
        '/index.js',
        '/manifest.json'
      ]))
    );
});
  
self.addEventListener('fetch', (e) => {
    e.respondWith(
      caches.match(e.request).then((response) => response || fetch(e.request))
    );
});