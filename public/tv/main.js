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

  const playCurrent = () => {
    if (playlist.length === 0) {
      fallback.style.display = 'block'
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

  const getTodayVideos = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('videos')
      .select('url')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      console.warn("Sin videos válidos, usando respaldo.")
      playlist = [isLegacy ? '/tv-player/videos/backup/tomas_v7.mp4' : '/tv/videos/backup/tomas_v7.mp4']
    } else {
      playlist = data.map(v => v.url)
    }

    currentIndex = 0
    playCurrent()
  }

  getTodayVideos()

  // Actualiza la lista automáticamente cada 5 minutos si no está reproduciendo
  setInterval(async () => {
    if (videoElement.paused || videoElement.ended) {
      await getTodayVideos()
      console.log("Playlist actualizada automáticamente.")
    }
  }, 2 * 60 * 1000)