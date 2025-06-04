self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("tv-player-cache").then(cache =>
      cache.addAll([
        "/", // index.html
        "/src/main.js", // solo si es ruta válida en tu build
        "/manifest.json"
        // no incluyas íconos ni cosas que fallan
      ]).catch(err => console.error("Error al cachear archivos:", err))
    )
  )
})

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  )
})
