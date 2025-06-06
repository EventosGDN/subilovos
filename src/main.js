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
      fetchVideoList()
    } else {
      deleteStatus.textContent = 'Error al eliminar video o registro.'
      console.error(deleteError || dbError)
    }
  })

 uploadBtn.addEventListener('click', async () => {
  const fileInput = document.getElementById('videoInput');
  const file = fileInput.files[0];
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const start = startInput.value;
  const end = endInput.value;

  if (!file || !start || !end) {
    status.textContent = 'Completá todos los campos.';
    return;
  }

  const cleanName = file.name.replace(/^temporales[\\/]/, '');
  const filePath = `temporales/${Date.now()}_${cleanName}`;

  try {
    status.textContent = 'Obteniendo URL...';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    // Obtener URL firmada de subida
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('videos')
      .createSignedUploadUrl(filePath);

    if (signedUrlError || !signedUrlData) throw signedUrlError;

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrlData.signedUrl, true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        progressBar.style.width = `${percent.toFixed(0)}%`;
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200) {
        const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
        const url = data.publicUrl;

        const { error: insertError } = await supabase.from('videos').insert([
          { name: file.name, url, start_date: start, end_date: end }
        ]);

        if (insertError) throw insertError;

        status.textContent = '✅ Video subido y registrado correctamente.';
        fileInput.value = '';
        startInput.value = '';
        endInput.value = '';
        progressContainer.style.display = 'none';
        fetchVideoList();
      } else {
        throw new Error('Error al subir video.');
      }
    };

    xhr.onerror = () => {
      throw new Error('Fallo al conectar para subir el archivo.');
    };

    xhr.send(file);
  } catch (err) {
    status.textContent = `❌ Error: ${err.message}`;
    progressContainer.style.display = 'none';
    console.error(err);
  }
});

  fetchVideoList()
})
