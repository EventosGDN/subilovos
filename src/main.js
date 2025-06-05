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

      // No hay timestamp, así que solo mostramos el nombre
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

const { error } = await supabase.storage.from('videos').remove(files)

    if (!error) {
      deleteStatus.textContent = `${files.length} video(s) eliminados.`
      fetchVideoList()
    } else {
      deleteStatus.textContent = 'Error al eliminar.'
    }
  })

  uploadBtn.addEventListener('click', async () => {
    const file = document.getElementById('videoInput').files[0]
    const start = document.getElementById('startDate').value
    const end = document.getElementById('endDate').value

    if (!file || !start || !end) {
      status.textContent = 'Completá todos los campos.'
      return
    }

    const cleanName = file.name.replace(/^temporales[\\/]/, '');
    const filePath = `temporales/${Date.now()}_${cleanName}`;


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
      fetchVideoList()
    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`
      progressContainer.style.display = 'none'
    }
  })

  fetchVideoList()
})
