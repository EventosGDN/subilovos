var supabase = supabase.createClient(
  'https://wqrkkkqmbrksleagqsli.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxcmtra3FtYnJrc2xlYWdxc2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTA1OTMsImV4cCI6MjA2NDYyNjU5M30.XNGR57FM29Zxskyzb8xeXLrBtH0cnco9yh5X8Sb4ISY'
)

var videoElement = document.getElementById('videoPlayer')
videoElement.muted = true
videoElement.volume = 1.0
videoElement.setAttribute('playsinline', '')
videoElement.setAttribute('autoplay', '')

supabase
  .from('videos')
  .select('url, start_date, end_date')
  .then(function (res) {
    if (res.error) {
      document.body.innerHTML += '<p style="color:red">Error al consultar Supabase.</p>'
      return
    }

    var ahora = new Date().toISOString()
    var activos = res.data.filter(function (v) {
      return v.start_date <= ahora && v.end_date > ahora
    })

    if (activos.length === 0) {
      document.body.innerHTML += '<p style="color:orange">No hay videos activos.</p>'
      return
    }

    videoElement.src = activos[0].url
    videoElement.load()
    var playPromise = videoElement.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(function (e) {
        document.body.innerHTML += '<p style="color:red">Error al reproducir: ' + e.message + '</p>'
      })
    }
  })
