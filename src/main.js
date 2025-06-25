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

  const cleanExpiredVideos = async () => {
  const now = new Date().toISOString()

  const { data: expired, error } = await supabase
    .from('videos')
    .select('url')
    .lt('end_date', now)

  if (error) {
    console.warn('Error al buscar vencidos:', error)
    return
  }

  if (!expired || expired.length === 0) return

  const urls = expired.map(v => v.url)
  const filePaths = urls.map(url => {
    const parts = url.split('/')
    return `temporales/${parts[parts.length - 1]}`
  })

  const { error: storageError } = await supabase
    .storage.from('videos')
    .remove(filePaths)

  const { error: dbError } = await supabase
    .from('videos')
    .delete()
    .in('url', urls)

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
      return
    }

    videoList.innerHTML = data?.length
      ? data.map(item => `
        <div class="video-item">
          <input type="checkbox" value="${item.name}" />
          ${item.name}
        </div>`).join('')
      : '<p>No hay videos disponibles.</p>'
  }

  deleteBtn.addEventListener('click', async () => {
  const checked = [...videoList.querySelectorAll('input:checked')]
  const files = checked.map(cb => cb.value)

  let errores = []

  for (const name of files) {
    try {
      const response = await fetch('https://subilovos-production.up.railway.app/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })  // 👈 ahora usamos correctamente "name"
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Error desconocido')
      console.log(`✅ Borrado exitoso: ${name}`)
    } catch (err) {
      console.error(`❌ Error al borrar ${name}:`, err)
      errores.push(name)
    }
  }

  if (errores.length === 0) {
    deleteStatus.textContent = `${files.length} video(s) eliminados.`
    deleteStatus.classList.add('fade-out')
    setTimeout(() => deleteStatus.classList.add('hide'), 3000)
    setTimeout(() => {
      deleteStatus.textContent = ''
      deleteStatus.classList.remove('fade-out', 'hide')
    }, 4000)
  } else {
    deleteStatus.textContent = '❌ Error al borrar uno o más videos.'
  }

  fetchVideoList()
})



  // Utilidad para convertir a UTC ISO string
const toUTC = (dateStr, timeStr) => {
  const local = new Date(`${dateStr}T${timeStr}`)
  return new Date(local.getTime() - local.getTimezoneOffset() * 60000).toISOString()
}

uploadBtn.addEventListener('click', async () => {
  const fileInput = document.getElementById('videoInput')
  const file = fileInput.files[0]

  const start = new Date(`${startDateDate.value}T${startDateTime.value}`).toISOString()
  const end = new Date(`${endDateDate.value}T${endDateTime.value}`).toISOString()

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

  const formData = new FormData()
  formData.append('video', file)
formData.append('start', start)
formData.append('end', end)


  try {
    status.textContent = 'Subiendo y comprimiendo...'
    progressContainer.style.display = 'block'
    progressBar.style.width = '0%'

    const response = await fetch('https://subilovos-production.up.railway.app/upload', {

      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(await response.text())
    }

    // Supongamos que el backend devuelve la URL del video subido
    const { url, finalName } = await response.json()

    if (insertErr) {
  console.error('Error al insertar en la tabla videos:', insertErr)
  throw insertErr
}

// Mostrar mensaje inicial
const statusCheck = document.createElement('div')
statusCheck.textContent = '⏳ Esperando que el video esté listo...'
statusCheck.style.color = 'orange'
status.parentNode.appendChild(statusCheck)

// Chequear cada 5 segundos si el video está listo
const interval = setInterval(async () => {
  const { data, error } = await supabase
    .from('videos')
    .select('status')
    .eq('name', finalName)

  if (error) {
    console.error('Error verificando estado:', error)
    return
  }

  if (data && data[0]?.status === 'ready') {
    clearInterval(interval)
    statusCheck.textContent = '✅ Video procesado y listo para usar.'
    statusCheck.style.color = 'green'
    fetchVideoList()
  }
}, 5000)



    progressBar.style.width = '100%'
    status.textContent = '✅ Video comprimido y registrado correctamente.'
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


  cleanExpiredVideos()
  fetchVideoList()
})
