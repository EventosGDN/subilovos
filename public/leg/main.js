var videoA = document.getElementById('videoA')
var videoB = document.getElementById('videoB')
var fallback = document.getElementById('fallback')

var BACKUP_URL = '/tv/videos/backup/Tomas asistente.mp4'
var playlist = []
var currentIndex = 0
var currentPlayer = videoA
var nextPlayer = videoB

videoA.muted = videoB.muted = true
videoA.volume = videoB.volume = 1.0
videoA.setAttribute('playsinline', '')
videoB.setAttribute('playsinline', '')
videoA.setAttribute('autoplay', '')
videoB.setAttribute('autoplay', '')

function reproducirVideo(url) {
  fallback.style.display = 'none'

  nextPlayer.src = url
  nextPlayer.load()

  nextPlayer.oncanplay = function () {
    currentPlayer.style.display = 'none'
    nextPlayer.style.display = 'block'
    nextPlayer.play().catch(mostrarBackup)

    var temp = currentPlayer
    currentPlayer = nextPlayer
    nextPlayer = temp
  }
}

function mostrarBackup() {
  fallback.style.display = 'none'
  currentPlayer.src = BACKUP_URL
  currentPlayer.load()
  currentPlayer.play()
}

currentPlayer.addEventListener('ended', function () {
  if (playlist.length > 0) {
    currentIndex = (currentIndex + 1) % playlist.length
    reproducirVideo(playlist[currentIndex])
  } else {
    currentPlayer.currentTime = 0
    currentPlayer.play()
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
    if (xhr.readyState === 4 && xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText)
        callback(data.map(v => v.url))
      } catch (e) {
        callback([])
      }
    } else if (xhr.readyState === 4) {
      callback([])
    }
  }

  xhr.send()
}

function actualizarPlaylist(callback) {
  obtenerVideosSupabase(function (urls) {
    if (urls.length > 0) {
      var cambio = JSON.stringify(urls) !== JSON.stringify(playlist)
      if (cambio) {
        playlist = urls
        currentIndex = 0
        reproducirVideo(playlist[currentIndex])
      }
    } else {
      if (playlist.length > 0) {
        playlist = []
        mostrarBackup()
      }
    }
    if (callback) callback()
  })
}

actualizarPlaylist()
setInterval(actualizarPlaylist, 30000)
