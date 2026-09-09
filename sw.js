self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  clients.claim();
});

self.addEventListener('fetch', (e) => {
  // NE PAS intercepter les requêtes vers Google Apps Script (évite les erreurs CORS et de type Response)
  if (e.request.url.includes('script.google.com')) {
    return; // Laisse le navigateur gérer la requête directement
  }

  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
