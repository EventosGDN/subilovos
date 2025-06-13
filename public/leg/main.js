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
  currentIndex = (currentIndex + 1) % playlist.length
  if (playlist.length > 0) {
    reproducirVideo(playlist[currentIndex])
  } else {
    mostrarBackup()
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
      var cambio = JSON.stringify(urls) !== JSON.stringify(playlist)
      playlist = urls
      if (typeof callback === 'function') callback(true, cambio)
    } else {
      playlist = []
      if (typeof callback === 'function') callback(false, false)
    }
  })
}

// Primer inicio
actualizarPlaylist(function (hayVideos) {
  if (hayVideos) {
    currentIndex = 0
    reproducirVideo(playlist[currentIndex])
  } else {
    mostrarBackup()
  }
})

// Cada 30s verifica si vencieron y recarga lista SOLO si hay cambio
setInterval(function () {
  actualizarPlaylist(function (hayVideos, cambio) {
    if (!hayVideos) {
      mostrarBackup()
    }
    // Solo reinicia si hay un cambio real en la lista
    else if (cambio) {
      currentIndex = 0
      reproducirVideo(playlist[currentIndex])
    }
  })
}, 30000)
