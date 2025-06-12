var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

videoElement.muted = true
videoElement.volume = 1.0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')
videoElement.setAttribute('loop', '')

var videoUrl = '/tv/videos/backup/Tomas asistente.mp4'

function reproducir() {
  fallback.style.display = 'none'
  videoElement.src = videoUrl
  videoElement.load()
  var playPromise = videoElement.play()
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function (e) {
      fallback.style.display = 'block'
      document.body.innerHTML += '<p style="color:red">Error al reproducir: ' + e.message + '</p>'
    })
  }
}

reproducir()
