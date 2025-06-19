var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.muted = true
videoElement.volume = 0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')
videoElement.setAttribute('muted', 'true')

var BACKUP_URL = '/tv/videos/backup/Tomas asistente.mp4'
var playlist = []
var currentIndex = 0

function reproducirVideo(url) {
  fallback.style.display = 'none'
  videoElement.style.display = 'none'
  videoElement.src = url
  videoElement.load()

  setTimeout(function () {
    const playPromise = videoElement.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function (e) {
        console.log("Fallo reproducción. Motivo:", e.message)
        mostrarBackup()
      })
    } else {
      videoElement.style.display = 'block'
    }
  }, 500)
}

function mostrarBackup() {
  fallback.style.display = 'none'
  videoElement.style.display = 'none'
  videoElement.src = BACKUP_URL
  videoElement.load()
  setTimeout(() => {
    videoElement.play()
    videoElement.style.display = 'block'
  }, 500)
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
  xhr.setRequestHeader('apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  xhr.setRequestHeader('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')

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

actualizarPlaylist()
setInterval(function () {
  actualizarPlaylist()
}, 30000)
