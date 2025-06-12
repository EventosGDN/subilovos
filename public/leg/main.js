var supabase = supabase.createClient(
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

function reproducirActual() {
  if (playlist.length === 0) {
    fallback.style.display = 'block'
    videoElement.removeAttribute('src')
    videoElement.load()
    return
  }

  fallback.style.display = 'none'
  videoElement.src = playlist[currentIndex]
  videoElement.load()

  var playPromise = videoElement.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function (e) {
      console.warn("Error al reproducir:", e.message)
      fallback.style.display = 'block'
    })
  }
}

videoElement.addEventListener('ended', function () {
  currentIndex = (currentIndex + 1) % playlist.length
  reproducirActual()
})

function obtenerVideosActivos(callback) {
  var ahora = new Date().toISOString()
  supabase
    .from('videos')
    .select('url, start_date, end_date')
    .lte('start_date', ahora)
    .gt('end_date', ahora)
    .order('start_date', { ascending: true })
    .then(function (res) {
      if (res.error) {
        console.warn("❌ Error al consultar Supabase:", res.error)
        callback([])
        return
      }
      var urls = res.data.map(function (v) { return v.url })
      callback(urls)
    })
}

function iniciarPlaylist() {
  obtenerVideosActivos(function (urls) {
    if (!urls || urls.length === 0) {
      playlist = ['/tv/videos/backup/Tomas asistente.mp4']
    } else {
      playlist = urls
    }
    currentIndex = 0
    reproducirActual()
  })
}

iniciarPlaylist()
