/* ═══════════════════════════════════════════════
   TE HOE O TEMATA — Service Worker PWA
   Cache complet hors ligne
   Version: 3.2
═══════════════════════════════════════════════ */

const CACHE_NAME = 'te-hoe-v3-2';

// Tout ce qui doit être disponible hors ligne
const ASSETS = [
  './te_hoe_app_v3_2.html',
  './manifest.json',
  // Polices Google (si déjà chargées une fois, elles sont dans le cache)
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Cinzel:wght@400;600;700&family=Noto+Sans:wght@300;400;500&display=swap',
];

// Installation — mise en cache de tous les assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        // Les polices Google peuvent échouer sans internet — pas bloquant
        console.warn('[SW] Certains assets non cachés au démarrage :', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des vieux caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stratégie : cache d'abord, réseau en fallback
self.addEventListener('fetch', event => {
  // Ne pas intercepter les requêtes Stripe / externes de paiement
  const url = event.request.url;
  if (url.includes('stripe.com') || url.includes('checkout.stripe')) {
    return; // laisse passer directement
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Pas en cache → réseau
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Réseau indisponible et pas en cache
        // Pour les pages HTML : retourner l'app principale
        if (event.request.destination === 'document') {
          return caches.match('./te_hoe_app_v3_2.html');
        }
      });
    })
  );
});

// Message depuis l'app pour forcer la mise à jour
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
