var supabase = Supabase.createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY'
)

var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.muted = true
videoElement.volume = 1.0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')

var playlist = []
var currentIndex = 0

function reproducir() {
  if (playlist.length === 0) {
    fallback.style.display = 'block'
    videoElement.src = '/tv/videos/backup/Tomas asistente.mp4'
    videoElement.load()
    videoElement.play()
    return
  }

  fallback.style.display = 'none'
  videoElement.src = playlist[currentIndex]
  videoElement.load()
  videoElement.play()
}

videoElement.addEventListener('ended', function () {
  currentIndex = (currentIndex + 1) % playlist.length
  reproducir()
})

function cargarVideos(callback) {
  var now = new Date().toISOString()
  supabase
    .from('videos')
    .select('url, start_date, end_date')
    .lte('start_date', now)
    .gt('end_date', now)
    .order('start_date', { ascending: true })
    .then(function (res) {
      if (res.error || !res.data || res.data.length === 0) {
        console.warn("No hay videos disponibles, se usará el de respaldo.")
        playlist = []
      } else {
        playlist = res.data.map(function (v) { return v.url })
        currentIndex = 0
      }
      callback()
    })
    .catch(function (e) {
      console.warn("Error al consultar Supabase:", e)
      playlist = []
      callback()
    })
}

cargarVideos(function () {
  reproducir()
})

// Revisa si hay nuevos videos cada 2 minutos
setInterval(function () {
  cargarVideos(function () {
    if (playlist.length > 0) {
      currentIndex = 0
      reproducir()
    }
  })
}, 120000)
