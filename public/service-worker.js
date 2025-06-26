const CACHE_NAME = "subilo-vos-v1"
const URLS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/src/main.js" // si esta ruta realmente existe
]

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .catch(err => console.error("Error al cachear archivos:", err))
  )
})

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  )
})

self.addEventListener("activate", event => {
  // Limpia versiones antiguas del cache
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  )
})
