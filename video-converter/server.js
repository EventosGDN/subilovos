if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './video-converter/.env' })
}

const express = require('express')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')
const ffmpegPath = require('ffmpeg-static')
const cors = require('cors')

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
const port = process.env.PORT || 3000

// CORS completo
const corsOptions = {
  origin: 'https://subilovos.vercel.app',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) // responde a preflight

// Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Test
app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// Subida
// Upload endpoint (procesamiento en segundo plano)
app.post('/upload', upload.single('video'), async (req, res) => {
  const originalPath = req.file.path
  const filename = path.parse(req.file.filename).name
  const finalName = `${Date.now()}_${Date.now()}_${filename}_converted.mp4`
  const videoPath = `temporales/${finalName}`

  // Insertamos registro en la tabla con estado 'processing'
  const { data: insertData, error: insertError } = await supabase
    .from('videos')
    .insert([
      {
        name: finalName,
        url: null,
        start_date: req.body.start_date || null,
        end_date: req.body.end_date || null,
        status: 'processing',
      },
    ])

  if (insertError) {
    console.error('❌ Error al insertar registro inicial:', insertError)
    return res.status(500).json({ error: 'Error al registrar video' })
  }

  // Respuesta inmediata
  res.status(200).json({ message: '🟡 Video recibido y en procesamiento', finalName })

  // Procesamiento en segundo plano
  try {
    const outputPath = `uploads/${finalName}`

    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions(['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    const fileBuffer = fs.readFileSync(outputPath)

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(videoPath, fileBuffer, {
        contentType: 'video/mp4',
      })

    if (uploadError) throw uploadError

    const { data: publicData, error: publicUrlError } = supabase
      .storage
      .from('videos')
      .getPublicUrl(videoPath)

    if (publicUrlError) throw publicUrlError

    const publicUrl = publicData.publicUrl

    // Actualizamos la tabla
    const { error: updateError } = await supabase
      .from('videos')
      .update({ url: publicUrl, status: 'ready' })
      .eq('name', finalName)

    if (updateError) throw updateError

    console.log('✅ Video listo y actualizado:', publicUrl)
  } catch (err) {
    console.error('❌ Error en procesamiento en segundo plano:', err)
    await supabase
      .from('videos')
      .update({ status: 'failed' })
      .eq('name', finalName)
  } finally {
    fs.unlinkSync(originalPath)
    if (fs.existsSync(`uploads/${finalName}`)) fs.unlinkSync(`uploads/${finalName}`)
  }
})


// Borrado
app.delete('/delete', express.json(), async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Falta el nombre del archivo' })
  }

  try {
    const path = `temporales/${name}`

    const { error: storageError } = await supabase
      .storage
      .from('videos')
      .remove([path])

    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('name', name)

    if (dbError) throw dbError

    res.status(200).json({ message: '✅ Eliminado de storage y tabla' })
  } catch (err) {
    console.error('❌ Error al borrar:', err)
    res.status(500).json({ error: err.message })
  }
})

// Iniciar
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`)
})
