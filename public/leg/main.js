var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.muted = true
videoElement.volume = 1.0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')

var BACKUP_URL = '/tv/videos/backup/Tomas asistente.mp4'

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
  videoElement.currentTime = 0
  videoElement.play()
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
          if (respuesta.length > 0) {
            callback(respuesta[0].url)
          } else {
            callback(null)
          }
        } catch (e) {
          callback(null)
        }
      } else {
        callback(null)
      }
    }
  }

  xhr.send()
}

// Primer intento
obtenerVideosSupabase(function (url) {
  if (url) {
    reproducirVideo(url)
  } else {
    mostrarBackup()
  }
})
