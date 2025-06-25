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
const fetch = require('node-fetch') // si no está, instalar con npm install node-fetch

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

// Subida
app.post('/upload', upload.single('video'), async (req, res) => {
  const { start, end } = req.body
  const file = req.file

  if (!file) return res.status(400).send('No se recibió archivo.')
  if (!start || !end) return res.status(400).send('Faltan fechas.')

  const inputPath = file.path
  const timestamp = Date.now()
  const finalName = `${timestamp}_${file.originalname}`
  const outputPath = `uploads/compressed_${finalName}`

  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUploadUrl(`temporales/${finalName}`)

  if (error || !data?.url || !data?.token) {
    console.error('Error obteniendo URL firmada:', error)
    return res.status(500).send('No se pudo generar URL de subida.')
  }

  const uploadUrl = data.url
  const uploadToken = data.token

  // Responder primero
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/temporales/${finalName}`
  res.json({ url: publicUrl, finalName })

  // Procesar luego
  procesarYSubir(inputPath, outputPath, uploadUrl, uploadToken, finalName)
})

function procesarYSubir(inputPath, outputPath, uploadUrl, uploadToken, finalName) {
  ffmpeg(inputPath)
    .outputOptions('-b:v 1000k')
    .save(outputPath)
    .on('end', async () => {
      try {
        const videoData = fs.readFileSync(outputPath)

        await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${uploadToken}`,
            'Content-Type': 'video/mp4'
          },
          body: videoData
        })

        await supabase
          .from('videos')
          .update({ status: 'ready' })
          .eq('name', finalName)

        fs.unlinkSync(inputPath)
        fs.unlinkSync(outputPath)
        console.log(`✅ Completado y subido: ${finalName}`)
      } catch (e) {
        console.error('❌ Error en la compresión o subida:', e)
      }
    })
    .on('error', err => {
      console.error('❌ FFMPEG error:', err)
    })
}

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
