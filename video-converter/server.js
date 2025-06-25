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
const fetch = require('node-fetch') // ⚠️ requerido en Railway

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
const port = process.env.PORT || 3000

// CORS
const corsOptions = {
  origin: 'https://subilovos.vercel.app',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

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

// Upload
app.post('/upload', upload.single('video'), async (req, res) => {
  const { start, end } = req.body
  const file = req.file

  if (!file || !start || !end) {
    return res.status(400).send('Faltan datos.')
  }

  const inputPath = file.path
  const timestamp = Date.now()
  const finalName = `${timestamp}_${file.originalname}`
  const outputPath = `uploads/compressed_${finalName}`

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/temporales/${finalName}`
  res.json({ url: publicUrl, finalName })

  ffmpeg(inputPath)
    .outputOptions('-b:v 1000k')
    .save(outputPath)
    .on('end', async () => {
      try {
        const videoData = fs.readFileSync(outputPath)

        const { error: uploadError } = await supabase.storage
          .from('videos')
          .upload(`temporales/${finalName}`, videoData, {
            contentType: 'video/mp4',
            upsert: true,
          })

        if (uploadError) {
          throw uploadError
        }

        await supabase
          .from('videos')
          .update({ status: 'ready' })
          .eq('name', finalName)

        fs.unlinkSync(inputPath)
        fs.unlinkSync(outputPath)
        console.log(`✅ Subido: ${finalName}`)
      } catch (e) {
        console.error('❌ Error en compresión/subida:', e)
      }
    })
    .on('error', (err) => {
      console.error('❌ FFMPEG error:', err)
    })
})

// Delete
app.delete('/delete', express.json(), async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Falta nombre' })

  try {
    const path = `temporales/${name}`

    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([path])

    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('name', name)

    if (dbError) throw dbError

    res.status(200).json({ message: '✅ Eliminado' })
  } catch (err) {
    console.error('❌ Borrado error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Start server
app.listen(port, () => {
  console.log(`🚀 Servidor en http://localhost:${port}`)
})
