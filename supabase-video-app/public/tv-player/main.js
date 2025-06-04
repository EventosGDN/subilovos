import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const videoElement = document.getElementById('videoPlayer')

// Opcional: desmutear con JS (algunos navegadores lo bloquean)
videoElement.muted = false
videoElement.volume = 1.0

const getTodayVideo = async () => {
  const today = new Date().toISOString().split('T')[0] // formato YYYY-MM-DD

  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false }) // el más nuevo primero
    .limit(1)

  if (error || !data || data.length === 0) {
    // No hay video válido → cargar respaldo
    videoElement.src = 'videos/backup/tomas_v7.mp4'
  } else {
    videoElement.src = data[0].url
  }

  videoElement.play().catch(err => {
    console.error("Error al reproducir:", err)
  })
}

getTodayVideo()
