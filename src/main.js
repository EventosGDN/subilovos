import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

document.getElementById('uploadBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('videoInput')
  const start = document.getElementById('startDate').value
  const end = document.getElementById('endDate').value
  const status = document.getElementById('status')

  const file = fileInput.files[0]
  if (!file || !start || !end) {
    status.textContent = 'Completá todos los campos.'
    return
  }

  const filePath = `${Date.now()}_${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('videos')
    .upload(filePath, file)

  if (uploadError) {
    status.textContent = 'Error al subir archivo: ' + uploadError.message
    return
  }

  const { data } = supabase.storage.from('videos').getPublicUrl(filePath)
  const url = data.publicUrl

  const { error: insertError } = await supabase
    .from('videos')
    .insert([{ name: file.name, url, start_date: start, end_date: end }])

  if (insertError) {
    status.textContent = 'Error al registrar en la base de datos.'
  } else {
    status.textContent = 'Video subido y registrado correctamente.'
  }
})
