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
app.use(cors()) // ✅ habilita CORS para todo

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

// Ruta de subida
app.post('/upload', upload.single('video'), async (req, res) => {
  const originalPath = req.file.path
  const filename = path.parse(req.file.filename).name
  const outputPath = `uploads/${filename}_converted.mp4`

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-crf', '28'
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    const fileBuffer = fs.readFileSync(outputPath)
    const videoPath = `temporales/${Date.now()}_${path.basename(outputPath)}`

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

res.status(200).json({ url: publicUrl })


  } catch (err) {
    console.error('❌ Error al procesar/subir:', err)
    res.status(500).json({ error: err.message || 'Error desconocido' })
  } finally {
    fs.unlinkSync(originalPath)
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
  }
})

// Inicio del servidor
app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`)
})
