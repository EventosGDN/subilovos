import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

document.addEventListener('DOMContentLoaded', () => {
  const uploadBtn = document.getElementById('uploadBtn')
  if (!uploadBtn) return

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

    try {
      status.textContent = 'Subiendo...'

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('videos').getPublicUrl(filePath)
      const url = data.publicUrl

      const { error: insertError } = await supabase.from('videos').insert([
        {
          name: file.name,
          url,
          start_date: start,
          end_date: end,
        },
      ])

      if (insertError) throw insertError

      status.textContent = 'Video subido y registrado correctamente.'
    } catch (err) {
      status.textContent = `Error: ${err.message}`
    }
  })
})

