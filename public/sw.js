const CACHE_NAME = 'life-logbook-shell-v3'
const APP_ROOT = new URL('./', self.registration.scope)
const INDEX_URL = new URL('index.html', APP_ROOT)

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME)
    const response = await fetch(INDEX_URL)
    await cache.put(INDEX_URL, response.clone())
    const html = await response.text()
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => new URL(match[1], self.location.origin))
    await Promise.all(assets.map(async (asset) => {
      try {
        const assetResponse = await fetch(asset)
        if (assetResponse.ok) await cache.put(asset, assetResponse)
      } catch {
        // Keep installation available when an optional asset cannot be fetched.
      }
    }))
    await self.skipWaiting()
  })())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(names.filter((name) => name.startsWith('life-logbook-') && name !== CACHE_NAME).map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(event.request, { ignoreVary: true })
    if (cached) return cached
    try {
      const response = await fetch(event.request)
      if (response.ok) await cache.put(event.request, response.clone())
      return response
    } catch {
      if (event.request.mode === 'navigate') return (await cache.match(INDEX_URL)) || Response.error()
      return Response.error()
    }
  })())
})