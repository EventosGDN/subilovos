import { createClient } from '@supabase/supabase-js'
import './style.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadBtn')
  const progressContainer = document.getElementById('progressContainer')
  const progressBar = document.getElementById('progressBar')
  const status = document.getElementById('status')
  const videoList = document.getElementById('videoList')
  const deleteBtn = document.getElementById('deleteBtn')
  const deleteStatus = document.getElementById('deleteStatus')

  const startDateDate = document.getElementById('startDateDate')
  const startDateTime = document.getElementById('startDateTime')
  const endDateDate = document.getElementById('endDateDate')
  const endDateTime = document.getElementById('endDateTime')

  const today = new Date()
  const yyyyMMdd = today.toISOString().split('T')[0]
  startDateDate.value = yyyyMMdd
  startDateTime.value = '00:00'
  endDateDate.value = yyyyMMdd
  endDateTime.value = '23:59'

  const toUTC = (dateStr, timeStr) => {
    const local = new Date(`${dateStr}T${timeStr}`)
    return new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString()
  }

  const cleanExpiredVideos = async () => {
    const now = new Date().toISOString()
    const { data: expired, error } = await supabase.from('videos').select('url').lt('end_date', now)
    if (error) return console.warn('Error al buscar vencidos:', error)
    if (!expired || expired.length === 0) return

    const urls = expired.map(v => v.url)
    const filePaths = urls.map(url => `temporales/${url.split('/').pop()}`)

    const { error: storageError } = await supabase.storage.from('videos').remove(filePaths)
    const { error: dbError } = await supabase.from('videos').delete().in('url', urls)

    if (!storageError && !dbError) {
      console.log(`🧹 ${filePaths.length} vencidos eliminados del Storage y tabla.`)
    } else {
      console.warn('⚠️ Error al limpiar:', storageError || dbError)
    }
  }

  const fetchVideoList = async () => {
    const { data, error } = await supabase.storage.from('videos').list('temporales')
    if (error) {
      console.error('Error al listar:', error)
      videoList.innerHTML = '<p>Error al cargar la lista de videos.</p>'
      return
    }

    videoList.innerHTML = data?.length
      ? data.map(item => `<div class="video-item">
            <input type="checkbox" value="${item.name}" />
            ${item.name}
          </div>`).join('')
      : '<p>No hay videos disponibles.</p>'
  }

  uploadBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('videoInput')
    const file = fileInput.files[0]
    const start = toUTC(startDateDate.value, startDateTime.value)
    const end = toUTC(endDateDate.value, endDateTime.value)

    if (!file || !start || !end) {
      status.textContent = 'Completá todos los campos.'
      return
    }

    if (new Date(end) <= new Date(start)) {
      status.innerHTML = '⚠️ La fecha y hora de fin debe ser posterior a la de inicio.'
      status.style.color = 'orange'
      return
    } else {
      status.style.color = ''
    }

    try {
      status.textContent = 'Subiendo...'
      progressContainer.style.display = 'block'
      progressBar.style.width = '0%'

      const formData = new FormData()
      formData.append('video', file)
      formData.append('start', start)
      formData.append('end', end)

      const res = await fetch('https://subilovos-production.up.railway.app/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Fallo al subir')

      progressBar.style.width = '100%'
      status.textContent = '✅ Video subido correctamente. Esperando compresión en segundo plano.'
      status.classList.add('fade-out')
      setTimeout(() => status.classList.add('hide'), 3000)
      setTimeout(() => {
        status.textContent = ''
        status.classList.remove('fade-out', 'hide')
      }, 4000)

      fileInput.value = ''
      progressContainer.style.display = 'none'
      fetchVideoList()
    } catch (err) {
      console.error(err)
      status.textContent = `❌ Error: ${err.message}`
      progressContainer.style.display = 'none'
    }
  })

  deleteBtn.addEventListener('click', async () => {
    const checked = [...videoList.querySelectorAll('input:checked')]
    const files = checked.map(cb => cb.value)
    let errores = []

    for (const name of files) {
      try {
        const response = await fetch('https://subilovos-production.up.railway.app/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Error desconocido')
        console.log(`✅ Borrado exitoso: ${name}`)
      } catch (err) {
        console.error(`❌ Error al borrar ${name}:`, err)
        errores.push(name)
      }
    }

    deleteStatus.textContent = errores.length === 0
      ? `${files.length} video(s) eliminados.`
      : '❌ Error al borrar uno o más videos.'
    deleteStatus.classList.add('fade-out')
    setTimeout(() => deleteStatus.classList.add('hide'), 3000)
    setTimeout(() => {
      deleteStatus.textContent = ''
      deleteStatus.classList.remove('fade-out', 'hide')
    }, 4000)

    fetchVideoList()
  })

  cleanExpiredVideos()
  fetchVideoList()
})

if ('serviceWorker' in navigator && 'PushManager' in window) {
  navigator.serviceWorker.register('/sw.js').then(async (registration) => {
    console.log('SW registrado')
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_PUSH_PUBLIC_KEY,
      })
      await fetch('https://subilovos-production.up.railway.app/api/save-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })
    }
  })
}
