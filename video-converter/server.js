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

// CORS permitido para Vercel
const corsOptions = {
  origin: 'https://subilovos.vercel.app',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}
app.use(cors(corsOptions))

const port = process.env.PORT || 3000

// Configuración de Multer
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

// Ruta de test
app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// Subida y registro de video
app.post('/upload', upload.single('video'), async (req, res) => {
  const originalPath = req.file.path
  const filename = path.parse(req.file.filename).name
  const outputPath = `uploads/${filename}_converted.mp4`

  try {
    console.log('📥 Iniciando proceso de subida:', originalPath)

    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions(['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    console.log('🎥 Video convertido:', outputPath)

    const fileBuffer = fs.readFileSync(outputPath)
    const finalName = `${Date.now()}_${Date.now()}_${path.basename(outputPath)}`
    const videoPath = `temporales/${finalName}`

    console.log('🆙 Subiendo a Supabase Storage:', videoPath)

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
    console.log('✅ URL pública generada:', publicUrl)

    await supabase.from('videos').insert([{
      name: finalName,                     // 👈 clave para el borrado
      url: publicUrl,
      start_date: req.body.start,
      end_date: req.body.end
    }])

    res.status(200).json({ url: publicUrl, name: finalName })

  } catch (err) {
    console.error('❌ Error general en /upload:', err)
    res.status(500).json({ error: err.message || 'Error desconocido' })
  } finally {
    fs.unlinkSync(originalPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
})

// Borrar video por name exacto
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

// Iniciar servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`)
})
