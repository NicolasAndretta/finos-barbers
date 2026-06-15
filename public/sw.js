const CACHE = 'finos-v1'

// Rutas a pre-cachear en la instalación
const PRECACHE_URLS = ['/', '/login', '/dashboard', '/turnos']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => {
      // Ignorar errores individuales — algunas rutas pueden requerir auth
      return Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Solo interceptar GET del mismo origen
  if (e.request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  // Pasar directamente: RSC, rutas de API y autenticación de Supabase
  const isRSC = e.request.headers.get('RSC') === '1'
  const isNextInternal = url.pathname.startsWith('/_next/webpack-hmr') ||
                         url.pathname.startsWith('/api/')
  if (isRSC || isNextInternal) return

  // Archivos estáticos de Next.js: cache-first (son inmutables por el hash del nombre)
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(
        (cached) => cached ?? fetch(e.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((c) => c.put(e.request, res.clone()))
          }
          return res
        })
      )
    )
    return
  }

  // Navegación y todo lo demás: network-first, cache como fallback offline
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.status < 400) {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
