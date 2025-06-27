var videoElement = document.getElementById('videoPlayer')
var fallback = document.getElementById('fallback')

// Configuración del video
videoElement.muted = false
videoElement.volume = 1.0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')

var BACKUP_URL = location.origin + '/AppDroid/backup/Tomasasistente.mp4'


// Mostrar video de respaldo
function mostrarBackup() {
  fallback.style.display = 'none'
  videoElement.style.display = 'block'
  videoElement.src = BACKUP_URL
  videoElement.load()

  videoElement.onloadeddata = function () {
    videoElement.play().catch(function () {
      fallback.style.display = 'block'
    })
  }
}

// Iniciar al cargar la página
document.addEventListener('DOMContentLoaded', mostrarBackup)

// Repetir en bucle
videoElement.addEventListener('ended', function () {
  videoElement.currentTime = 0
  videoElement.play()
})
// Versión actualizada - Forzar subida
