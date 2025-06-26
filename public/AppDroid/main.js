var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.muted = true
videoElement.volume = 0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')
videoElement.setAttribute('muted', 'true')

var BACKUP_URL = location.origin + '/tv/videos/backup/Tomas asistente.mp4'

function mostrarVideo() {
  videoElement.style.display = 'block'
}

function mostrarBackup() {
  fallback.style.display = 'none'
  videoElement.style.display = 'none'
  videoElement.src = BACKUP_URL
  videoElement.load()

  videoElement.onloadeddata = function () {
    videoElement.play().then(mostrarVideo).catch(function () {
      fallback.style.display = 'block'
    })
  }
}

// Al iniciar la página
document.addEventListener('DOMContentLoaded', function () {
  mostrarBackup()
})

// Repetir en bucle
videoElement.addEventListener('ended', function () {
  videoElement.currentTime = 0
  videoElement.play()
})
