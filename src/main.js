import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ... Supabase init igual

document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadBtn')
  const progressContainer = document.getElementById('progressContainer')
  const progressBar = document.getElementById('progressBar')

  uploadBtn.addEventListener('click', async () => {
    const file = document.getElementById('videoInput').files[0]
    const start = document.getElementById('startDate').value
    const end = document.getElementById('endDate').value
    const status = document.getElementById('status')

    if (!file || !start || !end) {
      status.textContent = 'Completá todos los campos.'
      return
    }

    const filePath = `temporales/${Date.now()}_${file.name}`
    status.textContent = 'Subiendo...'
    progressContainer.style.display = 'block'
    progressBar.style.width = '0%'

    try {
      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          upsert: false,
          // seguimiento de progreso personalizado (con workaround)
          onUploadProgress: (event) => {
            const percent = (event.loaded / event.total) * 100
            progressBar.style.width = percent.toFixed(0) + '%'
          }
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('videos').getPublicUrl(filePath)
      const url = data.publicUrl

      const { error: insertError } = await supabase.from('videos').insert([
        { name: file.name, url, start_date: start, end_date: end },
      ])

      if (insertError) throw insertError

      status.textContent = '✅ Subido correctamente'
      progressBar.style.width = '100%'
    } catch (err) {
      status.textContent = `❌ Error: ${err.message}`
      progressContainer.style.display = 'none'
    }
  })
})

