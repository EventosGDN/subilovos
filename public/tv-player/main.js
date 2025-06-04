import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY'
)

const videoElement = document.getElementById('videoPlayer')
videoElement.muted = true
videoElement.volume = 1.0

async function playVideos() {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })

  let currentIndex = 0

  const playNext = () => {
    if (!data || data.length === 0) {
      console.warn("No hay videos programados para hoy. Cargando respaldo.")
      videoElement.src = './videos/backup/tomas_v7.mp4'
    } else {
      videoElement.src = data[currentIndex].url
      currentIndex = (currentIndex + 1) % data.length
    }

    videoElement.play().catch(err => {
      console.error("Error al reproducir:", err)
    })
  }

  videoElement.addEventListener('ended', playNext)
  playNext()
}

playVideos()
console.log('TV Player versión compatible')
