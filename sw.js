// ============================================================================
// SERVICE WORKER - Sous-CRA Koumpentoum
// ============================================================================

// ⚠️ IMPORTANT : Incrémentez ce numéro à chaque nouveau déploiement
// pour forcer la mise à jour automatique chez les utilisateurs.
const CACHE_NAME = 'sous-cra-v1';

// Ressources statiques à mettre en cache dès l'installation
const URLS_A_PRECACHER = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// ============================================================================
// INSTALLATION
// ============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation de la version :', CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // On ajoute chaque ressource individuellement pour qu'une erreur
      // sur une seule n'empêche pas les autres d'être mises en cache
      return Promise.all(
        URLS_A_PRECACHER.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Échec précache pour :', url, err);
          })
        )
      );
    })
  );

  // Active immédiatement le nouveau SW sans attendre la fermeture des onglets
  self.skipWaiting();
});

// ============================================================================
// ACTIVATION
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation de la version :', CACHE_NAME);

  event.waitUntil(
    caches.keys().then((nomsCache) => {
      // Supprime tous les anciens caches qui ne correspondent plus
      return Promise.all(
        nomsCache
          .filter((nom) => nom !== CACHE_NAME)
          .map((nom) => {
            console.log('[SW] Suppression ancien cache :', nom);
            return caches.delete(nom);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================================================
// INTERCEPTION DES REQUÊTES
// ============================================================================
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ✅ NE JAMAIS intercepter les requêtes vers Google
  // (évite les erreurs CORS et de type Response)
  if (
    url.includes('script.google.com') ||
    url.includes('script.googleusercontent.com') ||
    url.includes('googleapis.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('lh3.googleusercontent.com') ||
    url.includes('drive.google.com')
  ) {
    return; // Laisse le navigateur gérer directement
  }

  // ✅ Ne pas intercepter les méthodes autres que GET
  // (POST, PUT, DELETE ne doivent pas être mis en cache)
  if (event.request.method !== 'GET') {
    return;
  }

  // ✅ Stratégie : Network first, fallback cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Met en cache uniquement les réponses valides (200 OK)
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // En cas d'échec réseau, cherche dans le cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;

          // Fallback pour la navigation : renvoie index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
