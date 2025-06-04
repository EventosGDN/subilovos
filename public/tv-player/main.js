import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY'
)

const videoElement = document.getElementById('videoPlayer')
videoElement.muted = true
videoElement.volume = 1.0

let playlist = []
let currentIndex = 0

const getTodayVideos = async () => {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) {
    console.warn("No hay videos programados. Cargando respaldo.")
    playlist = ['/tv-player/videos/backup/tomas_v7.mp4']
  } else {
    playlist = data.map(v => v.url)
console.log('Videos cargados:', playlist)

  }

  playCurrent()
}

const playCurrent = () => {
  if (playlist.length === 0) return

  videoElement.src = playlist[currentIndex]
  videoElement.play().catch(err => {
    console.error("Error al reproducir:", err)
  })
}

videoElement.addEventListener('ended', () => {
  currentIndex = (currentIndex + 1) % playlist.length
  playCurrent()
})

getTodayVideos()
