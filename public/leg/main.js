var videoA = document.getElementById('videoA')
var videoB = document.getElementById('videoB')
var fallback = document.getElementById('fallback')

var BACKUP_URL = '/tv/videos/backup/Tomas asistente.mp4'
var playlist = []
var currentIndex = 0
var activo = videoA
var pasivo = videoB

function reproducirVideo(video, url) {
  video.src = url
  video.load()
  video.play().catch(function () {
    mostrarBackup()
  })
}

function mostrarBackup() {
  fallback.style.display = 'none'
  videoA.style.display = 'block'
  videoB.style.display = 'none'
  videoA.src = BACKUP_URL
  videoA.load()
  videoA.play()
}

function alternar() {
  // Intercambia roles
  var temp = activo
  activo = pasivo
  pasivo = temp
}

function iniciarReproduccion() {
  if (playlist.length === 0) {
    mostrarBackup()
    return
  }

  let urlActual = playlist[currentIndex]
  let urlSiguiente = playlist[(currentIndex + 1) % playlist.length]

  activo.style.display = 'block'
  pasivo.style.display = 'none'

  reproducirVideo(activo, urlActual)
  pasivo.src = urlSiguiente
  pasivo.load()

  activo.onended = function () {
    currentIndex = (currentIndex + 1) % playlist.length
    alternar()
    iniciarReproduccion()
  }
}

function obtenerVideos(callback) {
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
          var data = JSON.parse(xhr.responseText)
          var urls = data.map(function (v) { return v.url })
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

// Iniciar
obtenerVideos(function (urls) {
  if (urls.length > 0) {
    playlist = urls
    currentIndex = 0
    iniciarReproduccion()
  } else {
    mostrarBackup()
  }
})
