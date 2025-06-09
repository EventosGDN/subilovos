import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY'
)

const isLegacy = (() => {
  const ua = navigator.userAgent
  return ua.includes("NETTV") || ua.includes("Vewd") || ua.includes("SmartTVA") || ua.includes("CE-HTML")
})()

const videoElement = document.getElementById('videoPlayer')
const fallback = document.getElementById('fallback')
videoElement.muted = true
videoElement.volume = 1.0

let playlist = []
let currentIndex = 0
let lastPlaylistRaw = ''

const playCurrent = () => {
  if (playlist.length === 0) {
    fallback.style.display = 'block'
    videoElement.removeAttribute('src')
    videoElement.load()
    return
  }

  fallback.style.display = 'none'
  videoElement.pause()
  videoElement.src = playlist[currentIndex]
  videoElement.load()
  videoElement.play().catch(err => console.warn("Error al reproducir:", err))
}

videoElement.addEventListener('ended', () => {
  currentIndex = (currentIndex + 1) % playlist.length
  playCurrent()
})

const fetchAndUpdatePlaylist = async () => {
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('videos')
    .select('url')
    .lte('start_date', now)
    .gt('end_date', now)
    .order('start_date', { ascending: true })

  if (error) {
    console.warn("Error al obtener videos:", error)
    return
  }

  const newUrls = data.map(v => v.url)
  const newRaw = newUrls.join(',')

  if (newRaw !== lastPlaylistRaw) {
    playlist = newUrls.length
      ? newUrls
      : [isLegacy ? '/tv-player/videos/backup/Tomas asistente.mp4' : '/tv/videos/backup/Tomas asistente.mp4']
    lastPlaylistRaw = newRaw
    currentIndex = 0
    console.log("🔁 Playlist actualizada automáticamente.")
  }
}

// Primera carga
await fetchAndUpdatePlaylist()
playCurrent()

// Verifica cambios en la playlist cada 60 segundos
setInterval(fetchAndUpdatePlaylist, 60000)
