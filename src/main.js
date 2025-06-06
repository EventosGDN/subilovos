import { createClient } from '@supabase/supabase-js'
import './style.css'

// Config Supabase
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
    const startInput = document.getElementById('startDate')
  const endInput = document.getElementById('endDate')
  const today = new Date().toISOString().split('T')[0]

  startInput.value = `${today}T00:00`
  endInput.value = `${today}T23:59`


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
      setTimeout(() => deleteStatus.textContent = '', 4000)
      fetchVideoList()
    } else {
      deleteStatus.textContent = 'Error al eliminar video o registro.'
      console.error(deleteError || dbError)
    }
  })

 uploadBtn.addEventListener('click', async () => {
  const fileInput = document.getElementById('videoInput')
  const file = fileInput.files[0]
  const startInput = document.getElementById('startDate')
  const endInput = document.getElementById('endDate')

  const start = startInput.value
  const end = endInput.value

  // Setear valores por defecto si están vacíos
  const today = new Date().toISOString().split('T')[0]
  if (!start) startInput.value = `${today}T00:00`
  if (!end) endInput.value = `${today}T23:59`

  // Validación de fechas
  const startDateTime = new Date(startInput.value)
  const endDateTime = new Date(endInput.value)

  if (endDateTime <= startDateTime) {
    status.innerHTML = '⚠️ La fecha y hora de fin debe ser posterior a la de inicio.'
    status.style.color = 'orange'
    return
  } else {
    status.style.color = ''
  }

  if (!file || !start || !end) {
    status.textContent = 'Completá todos los campos.'
    return
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
      { name: file.name, url, start_date: startInput.value, end_date: endInput.value },
    ])

    if (insertError) throw insertError

    status.textContent = '✅ Video subido y registrado correctamente.'
    setTimeout(() => status.textContent = '', 4000)
    fileInput.value = ''
    startInput.value = ''
    endInput.value = ''
    progressContainer.style.display = 'none'
    fetchVideoList()
  } catch (err) {
    status.textContent = `❌ Error: ${err.message}`
    progressContainer.style.display = 'none'
  }
})


  fetchVideoList()
})
