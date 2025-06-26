var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')
videoElement.setAttribute('muted', 'true')
videoElement.muted = true
videoElement.volume = 1.0

var BACKUP_URL = location.origin + '/tv/videos/backup/Tomas asistente.mp4'

var playlist = []
var currentIndex = 0

function mostrarVideo() {
  videoElement.style.display = 'block'
}

function reproducirVideo(url) {
  fallback.style.display = 'none'
  videoElement.style.display = 'none'
  videoElement.src = url
  videoElement.load()

  videoElement.onloadeddata = () => {
    videoElement.play()
      .then(mostrarVideo)
      .catch(() => mostrarBackup())
  }
}

function mostrarBackup() {
  fallback.style.display = 'none'
  videoElement.style.display = 'none'
  videoElement.src = BACKUP_URL
  videoElement.load()

  videoElement.onloadeddata = () => {
    videoElement.play()
      .then(mostrarVideo)
      .catch(() => {
        fallback.style.display = 'block'
      })
  }
}

videoElement.addEventListener('ended', () => {
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
          var urls = respuesta.map(v => v.url)
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
      let nuevaPlaylist = urls
      let cambio = JSON.stringify(nuevaPlaylist) !== JSON.stringify(playlist)

      if (cambio) {
        playlist = nuevaPlaylist
        currentIndex = 0
        reproducirVideo(playlist[currentIndex])
      }
    } else {
      if (playlist.length > 0) {
        playlist = []
        mostrarBackup()
      } else {
        mostrarBackup()
      }
    }

    if (typeof callback === 'function') callback()
  })
}

actualizarPlaylist()
setInterval(actualizarPlaylist, 30000)
