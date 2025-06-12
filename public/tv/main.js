var supabase = Supabase.createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY'
)

var isLegacy = (function () {
  var ua = navigator.userAgent
  return ua.indexOf("NETTV") !== -1 || ua.indexOf("Vewd") !== -1 || ua.indexOf("SmartTVA") !== -1 || ua.indexOf("CE-HTML") !== -1
})()

var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')
videoElement.muted = true
videoElement.volume = 1.0

var playlist = []
var currentIndex = 0

function playCurrent() {
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
  videoElement.play().catch(function (err) {
    console.warn("Error al reproducir:", err)
  })
}

videoElement.addEventListener('ended', function () {
  currentIndex = (currentIndex + 1) % playlist.length
  playCurrent()
})

function getActiveVideos(callback) {
  var now = new Date().toISOString()
  supabase
    .from('videos')
    .select('url, start_date, end_date')
    .lte('start_date', now)
    .gt('end_date', now)
    .order('start_date', { ascending: true })
    .then(function (result) {
      if (result.error) {
        console.warn("❌ Error al consultar videos:", result.error)
        callback([])
        return
      }
      var urls = result.data.map(function (v) { return v.url })
      callback(urls)
    })
}

function updatePlaylist(callback) {
  getActiveVideos(function (urls) {
    if (!urls || urls.length === 0) {
      playlist = [isLegacy ? '/tv-player/videos/backup/Tomas asistente.mp4' : '/tv/videos/backup/Tomas asistente.mp4']
    } else {
      playlist = urls
    }
    currentIndex = 0
    if (typeof callback === 'function') callback()
  })
}

// Primera carga
updatePlaylist(function () {
  playCurrent()
})

// Chequeo continuo (cada 30s)
setInterval(function () {
  var wasEmpty = playlist.length === 0 || (playlist[0] && playlist[0].indexOf('/backup/') !== -1)
  updatePlaylist(function () {
    if (wasEmpty && playlist.length > 0 && playlist[0].indexOf('/backup/') === -1) {
      console.log("Nuevo video disponible, iniciando.")
      playCurrent()
    }
  })
}, 30000)
