import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
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

const getActiveVideos = async () => {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('videos')
    .select('url, start_date, end_date')
    .lte('start_date', now)
    .gt('end_date', now)
    .order('start_date', { ascending: true })

  if (error) {
    console.warn("❌ Error al consultar videos:", error)
    return []
  }

  return data.map(v => v.url)
}

const updatePlaylist = async () => {
  const urls = await getActiveVideos()
  if (urls.length === 0) {
    playlist = [isLegacy ? '/tv-player/videos/backup/Tomas asistente.mp4' : '/tv/videos/backup/Tomas asistente.mp4']
  } else {
    playlist = urls
  }
  currentIndex = 0
}

// Primer carga
await updatePlaylist()
playCurrent()

// Chequeo continuo: actualiza lista incluso si el video sigue en curso
setInterval(async () => {
  const wasEmpty = playlist.length === 0 || playlist[0].includes('/backup/')
  await updatePlaylist()
  if (wasEmpty && playlist.length > 0 && !playlist[0].includes('/backup/')) {
    console.log("Nuevo video disponible, iniciando.")
    playCurrent()
  }
}, 30000)
