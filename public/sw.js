// Service worker de Control Freelancer Pro.
// Objetivo: que la app cargue más rápido y, sin conexión, muestre un aviso claro en lugar del error del navegador.
// NO guarda páginas, /api, ni nada de Supabase: son datos de clientes, cobros y sesión, y siempre van a la red.
// Subir VERSION cuando cambie esta lógica para limpiar cachés viejas.
const VERSION = 'freelancer-v1';
const CACHE = VERSION;
const MAX_ENTRADAS = 100;

const PRECARGA = ['/offline.html', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // Una por una: si un archivo falla no se cae toda la instalación.
      .then((c) => Promise.all(PRECARGA.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Evita que la caché crezca sin límite (cada despliegue genera archivos nuevos en /_next/static).
async function recortar(cache) {
  const claves = await cache.keys();
  if (claves.length > MAX_ENTRADAS) {
    await Promise.all(claves.slice(0, claves.length - MAX_ENTRADAS).map((k) => cache.delete(k)));
  }
}

function guardar(req, resp) {
  if (!resp || !resp.ok) return;
  const copia = resp.clone();
  caches.open(CACHE).then((c) => c.put(req, copia).then(() => recortar(c)));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Solo lo propio del sitio. Supabase, Google y demás dominios van directo a la red.
  if (url.origin !== self.location.origin) return;

  // Páginas: siempre red (son privadas y cambian por usuario). Sin red, se muestra el aviso.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Archivos de la app con nombre único por versión: caché primero, nunca cambian.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(req).then((enCache) => enCache || fetch(req).then((resp) => { guardar(req, resp); return resp; }))
    );
    return;
  }

  // Iconos e imágenes propias: sirve la caché y la refresca en segundo plano.
  if (/\.(?:png|svg|ico|woff2?)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((enCache) => {
        const red = fetch(req).then((resp) => { guardar(req, resp); return resp; }).catch(() => enCache);
        return enCache || red;
      })
    );
    return;
  }

  // Todo lo demás (API, datos de las pantallas, video, sw.js) no se toca.
});
