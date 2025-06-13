var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.muted = true
videoElement.volume = 1.0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')

var BACKUP_URL = '/tv/videos/backup/Tomas asistente.mp4'
var playlist = []
var currentIndex = 0

function reproducirVideo(url) {
  fallback.style.display = 'none'
  videoElement.src = url
  videoElement.load()
  videoElement.play().catch(function () {
    mostrarBackup()
  })
}

function mostrarBackup() {
  fallback.style.display = 'none'
  videoElement.src = BACKUP_URL
  videoElement.load()
  videoElement.play()
}

videoElement.addEventListener('ended', function () {
  if (playlist.length > 0) {
    currentIndex = (currentIndex + 1) % playlist.length
    reproducirVideo(playlist[currentIndex])
  } else {
    videoElement.currentTime = 0
    videoElement.play()
  }
})

function obtenerVideosSupabase(callback) {
  var xhr = new XMLHttpRequest()
  var ahora = new Date().toISOString()
  var url = 'https://wqrkkkqmbrksleagqsli.supabase.co/rest/v1/videos?select=url,start_date,end_date' +
            '&start_date=lte.' + encodeURIComponent(ahora) +
            '&end_date=gt.' + encodeURIComponent(ahora) +
            '&order=start_date.asc'

  xhr.open('GET', url, true)
  xhr.setRequestHeader('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY')
  xhr.setRequestHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY')

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      if (xhr.status === 200) {
        try {
          var respuesta = JSON.parse(xhr.responseText)
          var urls = respuesta.map(function (v) { return v.url })
          callback(urls)
        } catch (e) {
          callback([])
        }
      } else {
        callback([])
      }
    }
  }

  xhr.send()
}

function actualizarPlaylist(callback) {
  obtenerVideosSupabase(function (urls) {
    if (urls.length > 0) {
      var nuevaPlaylist = urls
      var cambio = JSON.stringify(nuevaPlaylist) !== JSON.stringify(playlist)
      if (cambio) {
        playlist = nuevaPlaylist
        currentIndex = 0
        reproducirVideo(playlist[currentIndex])
      }
    } else {
      if (playlist.length > 0) {
        playlist = []
        mostrarBackup()
      }
    }
    if (typeof callback === 'function') callback()
  })
}

// Primera carga
actualizarPlaylist()

// Verificación periódica cada 30 segundos
setInterval(function () {
  actualizarPlaylist()
}, 30000)
