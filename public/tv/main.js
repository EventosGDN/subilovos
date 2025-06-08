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

videoElement.addEventListener('ended', async () => {
  currentIndex = (currentIndex + 1) % playlist.length
  await getTodayVideos()
  playCurrent()
})

const getTodayVideos = async () => {
  const { data: nowResult, error: timeError } = await supabase.rpc('now_utc')
  if (timeError || !nowResult?.length) {
    console.warn("No se pudo obtener la hora UTC del servidor.")
    playlist = [isLegacy ? '/tv-player/videos/backup/Tomas asistente.mp4' : '/tv/videos/backup/Tomas asistente.mp4']
    return
  }

  const now = nowResult[0]

  const { data, error } = await supabase
    .from('videos')
    .select('url')
    .lte('start_date', now)
    .gt('end_date', now)
    .order('end_date', { ascending: true })

  if (error || !data || data.length === 0) {
    console.warn("Sin videos válidos, usando respaldo.")
    playlist = [isLegacy ? '/tv-player/videos/backup/Tomas asistente.mp4' : '/tv/videos/backup/Tomas asistente.mp4']
  } else {
    playlist = data.map(v => v.url)
  }

  currentIndex = 0
}

await getTodayVideos()
playCurrent()

setInterval(async () => {
  if (videoElement.paused || videoElement.ended) {
    await getTodayVideos()
    console.log("Playlist actualizada automáticamente.")
  }
}, 2 * 60 * 1000)
