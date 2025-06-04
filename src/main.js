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

  uploadBtn.addEventListener('click', async () => {
    const file = document.getElementById('videoInput').files[0]
    const start = document.getElementById('startDate').value
    const end = document.getElementById('endDate').value

    if (!file || !start || !end) {
      status.textContent = 'Completá todos los campos.'
      return
    }

    const filePath = `temporales/${Date.now()}_${file.name}`

    try {
      status.textContent = 'Subiendo...'
      progressContainer.style.display = 'block'
      progressBar.style.width = '0%'

      // Subida (sin barra real, simula con 100%)
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
    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`
      progressContainer.style.display = 'none'
    }
  })
})
