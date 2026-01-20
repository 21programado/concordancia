/* service-worker.js - Service Worker para PWA */

const CACHE_NAME = 'concordancia-v1.0.1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Archivos que se cachean al instalar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.tailwindcss.com'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando archivos estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  self.skipWaiting();
});

// Activación - Limpieza de cachés viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
            console.log('[SW] Eliminando caché viejo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Interceptar peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // No cachear peticiones a la API de Apps Script (siempre fresh)
  if (url.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Sin conexión. Por favor, conéctate a internet.'
          }),
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Estrategia: Cache First, fallback a Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Cachear dinámicamente recursos externos
        if (request.method === 'GET' && !url.hostname.includes('script.google.com')) {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }

        return networkResponse;
      });
    }).catch((error) => {
      console.error('[SW] Error en fetch:', error);
      
      // Fallback para páginas HTML
      if (request.headers.get('accept').includes('text/html')) {
        return caches.match('/index.html');
      }
    })
  );
});

// Manejo de mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cache) => {
        caches.delete(cache);
      });
    });
  }
});

// Sincronización en segundo plano (opcional)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en segundo plano');
  
  if (event.tag === 'sync-searches') {
    event.waitUntil(
      // Aquí podrías sincronizar búsquedas guardadas offline
      Promise.resolve()
    );
  }

});
