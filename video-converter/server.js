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

// ✅ CORS bien aplicado
const corsOptions = {
  origin: 'https://subilovos.vercel.app',
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}
app.use(cors(corsOptions))

const port = process.env.PORT || 3000

// 📦 Configuración de subida con Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

// 🧠 Supabase init
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// 🔍 Ruta simple de test
app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// 🎞️ Subida de video + compresión + subida a Supabase
app.post('/upload', upload.single('video'), async (req, res) => {
  const originalPath = req.file.path
  const filename = path.parse(req.file.filename).name
  const outputPath = `uploads/${filename}_converted.mp4`

  try {
    // Convertir con FFmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions(['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    // Subir a Supabase Storage
    const finalName = `${Date.now()}_${path.basename(outputPath)}`
    const videoPath = `temporales/${finalName}`
    const fileBuffer = fs.readFileSync(outputPath)

    const { error: uploadError } = await supabase
      .storage
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

    res.status(200).json({ url: publicUrl, name: finalName }) // opcionalmente devolvés el name

  } catch (err) {
    console.error('❌ Error al procesar/subir:', err)
    res.status(500).json({ error: err.message || 'Error desconocido' })
  } finally {
    fs.unlinkSync(originalPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
})

// 🗑️ Borrado por nombre (de Storage y tabla)
app.delete('/delete', express.json(), async (req, res) => {
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Falta el nombre del archivo' })
  }

  try {
    const path = `temporales/${name}`

    // 1. Borrar del storage
    const { error: storageError } = await supabase
      .storage
      .from('videos')
      .remove([path])

    if (storageError) throw storageError

    // 2. Borrar por `name` exacto en la tabla (más confiable que `ilike`)
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

// ▶️ Iniciar server
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`)
})
