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

function reproducir() {
  if (playlist.length === 0) {
    mostrarBackup()
    return
  }

  fallback.style.display = 'none'
  videoElement.src = playlist[currentIndex]
  videoElement.load()
  var playPromise = videoElement.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function (e) {
      fallback.style.display = 'block'
      document.body.innerHTML += '<p style="color:red">Error al reproducir: ' + e.message + '</p>'
    })
  }
}

function mostrarBackup() {
  fallback.style.display = 'none'
  videoElement.src = '/tv/videos/backup/Tomas asistente.mp4'
  videoElement.load()
  videoElement.play()
}

videoElement.addEventListener('ended', function () {
  currentIndex = (currentIndex + 1) % playlist.length
  reproducir()
})

function obtenerVideosValidos(callback) {
  var ahora = new Date().toISOString()
  supabase
    .from('videos')
    .select('url, start_date, end_date')
    .lte('start_date', ahora)
    .gt('end_date', ahora)
    .order('start_date', { ascending: true })
    .then(function (resultado) {
      if (resultado.error) {
        console.warn('Error al obtener videos:', resultado.error)
        callback([])
      } else {
        var urls = resultado.data.map(function (v) { return v.url })
        callback(urls)
      }
    })
}

function actualizarPlaylist() {
  obtenerVideosValidos(function (urls) {
    if (!urls || urls.length === 0) {
      playlist = []
    } else {
      playlist = urls
    }
    currentIndex = 0
    reproducir()
  })
}

// Primera carga
actualizarPlaylist()

// Actualiza cada 60 segundos
setInterval(actualizarPlaylist, 60000)
