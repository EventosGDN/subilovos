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

  const today = new Date().toISOString().split('T')[0]
  startDateDate.value = today
  startDateTime.value = '00:00'
  endDateDate.value = today
  endDateTime.value = '23:59'

  const toUTC = (d, t) => new Date(`${d}T${t}`).toISOString()

  const cleanExpiredVideos = async () => {
    const now = new Date().toISOString()
    const { data: expired, error } = await supabase.from('videos').select('url').lt('end_date', now)
    if (expired?.length) {
      const paths = expired.map(v => `temporales/${v.url.split('/').pop()}`)
      await supabase.storage.from('videos').remove(paths)
      await supabase.from('videos').delete().in('url', expired.map(v => v.url))
    }
  }

  const fetchVideoList = async () => {
    const { data, error } = await supabase.storage.from('videos').list('temporales')
    if (error || !data?.length) {
      videoList.innerHTML = '<p>No hay videos disponibles.</p>'
    } else {
      videoList.innerHTML = data.map(item => `
        <div class="video-item">
          <input type="checkbox" value="${item.name}" id="cb-${item.name}"/>
          <label for="cb-${item.name}">${item.name}</label>
        </div>`).join('')
    }
  }

  deleteBtn.addEventListener('click', async () => {
    const files = [...videoList.querySelectorAll('input:checked')].map(cb => cb.value)
    for (const name of files) {
      await fetch('https://subilovos-production.up.railway.app/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
    }
    deleteStatus.textContent = `${files.length} eliminados.`
    fetchVideoList()
  })

  let isUploading = false

  window.addEventListener('beforeunload', (e) => {
    if (isUploading) {
      e.preventDefault()
      e.returnValue = ''
    }
  })

  uploadBtn.addEventListener('click', async () => {
    const file = document.getElementById('videoInput').files[0]
    const start = toUTC(startDateDate.value, startDateTime.value)
    const end = toUTC(endDateDate.value, endDateTime.value)

    if (!file || !file.name.endsWith('.mp4') || new Date(end) <= new Date(start)) {
      status.textContent = 'Subí un archivo MP4 y completá correctamente los campos.'
      return
    }

    isUploading = true
document.getElementById('status').classList.add('uploading')
document.getElementById('uploadWarning').style.display = 'block'


    try {
      progressContainer.style.display = 'block'
      progressBar.style.width = '0%'
      status.textContent = 'Comprimiendo el video... Puede tardar varios minutos.'

      const formData = new FormData()
      formData.append('video', file)

      const uploadRes = await fetch('https://subilovos-production.up.railway.app/upload', {
        method: 'POST',
        body: formData
      })
      const uploadJson = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Error al subir')

      const finalName = uploadJson.finalName
      const path = `temporales/${finalName}`

      progressBar.style.width = '50%'
      status.textContent = 'Notificando al backend...'

      const backendRes = await fetch('https://subilovos-production.up.railway.app/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          url: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/videos/${path}`,
          start,
          end
        })
      })

      if (!backendRes.ok) {
        const text = await backendRes.text()
        throw new Error(`Error notificando al backend: ${text.slice(0, 100)}`)
      }

      progressBar.style.width = '80%'
      status.textContent = 'Esperando procesamiento...'

      const interval = setInterval(async () => {
        const { data } = await supabase.from('videos').select('status').eq('name', finalName)
        if (data?.[0]?.status === 'ready') {
          clearInterval(interval)
          status.textContent = '✅ Video listo.'
          progressBar.style.width = '100%'
          fetchVideoList()
        }
      }, 5000)
    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`
    } finally {
      setTimeout(() => progressContainer.style.display = 'none', 4000)
      isUploading = false
document.getElementById('status').classList.remove('uploading')
document.getElementById('uploadWarning').style.display = 'none'

    }
  })

  cleanExpiredVideos()
  fetchVideoList()
})
