import { createClient } from '@supabase/supabase-js'
import './style.css'

// Config Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

document.addEventListener('DOMContentLoaded', () => {
  const cleanExpiredVideos = async () => {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .lt('end_date', now)

    if (error || !data || data.length === 0) return

    const urlsToDelete = data.map(v => v.url)
    const filesToDelete = urlsToDelete.map(url => {
      const parts = url.split('/')
      return `temporales/${parts[parts.length - 1]}`
    })

    const { error: deleteStorageError } = await supabase
      .storage.from('videos')
      .remove(filesToDelete)

    const { error: deleteDbError } = await supabase
      .from('videos')
      .delete()
      .in('url', urlsToDelete)

    if (!deleteStorageError && !deleteDbError) {
      console.log(`${filesToDelete.length} video(s) vencidos eliminados automáticamente.`)
    } else {
      console.warn('Error al eliminar videos vencidos:', deleteStorageError || deleteDbError)
    }
  }

  cleanExpiredVideos()

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
  endDateDate.value = today
  startDateTime.value = '00:00'
  endDateTime.value = '23:59'

  const fetchVideoList = async () => {
    const { data, error } = await supabase.storage.from('videos').list('temporales')
    if (error) {
      console.error('Error al obtener la lista:', error)
      return
    }

    if (data && data.length > 0) {
      videoList.innerHTML = ''
      data.forEach(item => {
        const div = document.createElement('div')
        div.className = 'video-item'
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.value = item.name
        div.appendChild(checkbox)
        div.appendChild(document.createTextNode(item.name))
        videoList.appendChild(div)
      })
    } else {
      videoList.innerHTML = '<p>No hay videos disponibles.</p>'
    }
  }

  deleteBtn.addEventListener('click', async () => {
    const checked = [...videoList.querySelectorAll('input:checked')]
    const files = checked.map(cb => `temporales/${cb.value}`)
    const names = checked.map(cb => cb.value)

    const { error: deleteError } = await supabase.storage.from('videos').remove(files)
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .in('url', names.map(name => `https://wqrkkkqmbrksleagqsli.supabase.co/storage/v1/object/public/videos/temporales/${name}`))

    if (!deleteError && !dbError) {
      deleteStatus.textContent = `${files.length} video(s) eliminados.`
      deleteStatus.classList.add('fade-out')
      setTimeout(() => deleteStatus.classList.add('hide'), 3000)
      setTimeout(() => {
        deleteStatus.textContent = ''
        deleteStatus.classList.remove('fade-out', 'hide')
      }, 4000)
      fetchVideoList()
    } else {
      deleteStatus.textContent = 'Error al eliminar video o registro.'
      console.error(deleteError || dbError)
    }
  })

  uploadBtn.addEventListener('click', async () => {
    const fileInput = document.getElementById('videoInput')
    const file = fileInput.files[0]

    const start = `${startDateDate.value}T${startDateTime.value}`
    const end = `${endDateDate.value}T${endDateTime.value}`

    if (!file || !start || !end) {
      status.textContent = 'Completá todos los campos.'
      return
    }

    const startDateTimeVal = new Date(start)
    const endDateTimeVal = new Date(end)

    if (endDateTimeVal <= startDateTimeVal) {
      status.innerHTML = '⚠️ La fecha y hora de fin debe ser posterior a la de inicio.'
      status.style.color = 'orange'
      return
    } else {
      status.style.color = ''
    }

    const cleanName = file.name.replace(/^temporales[\\/]/, '')
    const filePath = `temporales/${Date.now()}_${cleanName}`

    try {
      status.textContent = 'Subiendo...'
      progressContainer.style.display = 'block'
      progressBar.style.width = '0%'

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      progressBar.style.width = '100%'

      const { data } = supabase.storage.from('videos').getPublicUrl(filePath)
      const url = data.publicUrl

      const { error: insertError } = await supabase.from('videos').insert([
        { name: file.name, url, start_date: start, end_date: end },
      ])

      if (insertError) throw insertError

      status.textContent = '✅ Video subido y registrado correctamente.'
      status.classList.add('fade-out')
      setTimeout(() => status.classList.add('hide'), 3000)
      setTimeout(() => {
        status.textContent = ''
        status.classList.remove('fade-out', 'hide')
      }, 4000)

      fileInput.value = ''
      startDateDate.value = today
      endDateDate.value = today
      startDateTime.value = '00:00'
      endDateTime.value = '23:59'
      progressContainer.style.display = 'none'
      fetchVideoList()
    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`
      progressContainer.style.display = 'none'
    }
  })

  fetchVideoList()
})
