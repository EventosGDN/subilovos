if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './video-converter/.env' })
}

const express = require('express')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
app.use(cors())
app.use(express.json({ limit: '200mb' }))
app.use(express.urlencoded({ extended: true, limit: '200mb' }))

const port = process.env.PORT || 3000

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// ✅ SUBIR VIDEO (usado solo si querés usar multer directo)
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' })

    const originalPath = req.file.path
    const finalName = req.file.filename.replace(/\.[^/.]+$/, '.mp4')
    const outputPath = `uploads/compressed_${finalName}`
    const cloudPath = `temporales/${finalName}`

    // Comprimir con ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .outputOptions('-preset veryfast', '-crf 28')
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run()
    })

    // Leer archivo comprimido
    const fileBuffer = fs.readFileSync(outputPath)

    const { error: storageError } = await supabase.storage
      .from('videos')
      .upload(cloudPath, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      })

    // Borrar archivos locales
    fs.unlinkSync(originalPath)
    fs.unlinkSync(outputPath)

    if (storageError) return res.status(500).json({ error: 'Error al subir a Supabase' })

    return res.status(200).json({ finalName })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
})

// ✅ REGISTRAR EN BASE DE DATOS (proceso luego de subir)
app.post('/procesar', async (req, res) => {
  try {
    const { name, url, start, end } = req.body
    if (!name || !url || !start || !end) {
      return res.status(400).json({ error: 'Faltan datos para registrar' })
    }

    const { error } = await supabase.from('videos').insert([
      { name, url, start_date: start, end_date: end, status: 'ready' }
    ])

    if (error) {
      console.error('Error al insertar en DB:', error)
      return res.status(500).json({ error: 'No se pudo registrar en la base de datos' })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Error interno en /procesar' })
  }
})

// ✅ BORRAR VIDEO (tanto de Supabase como de la tabla)
app.delete('/delete', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Falta nombre' })

    const filePath = `temporales/${name}`

    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([filePath])

    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('name', name)

    if (storageError || dbError) {
      console.error('Error al borrar:', storageError || dbError)
      return res.status(500).json({ error: 'No se pudo borrar correctamente' })
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Error interno en /delete' })
  }
})

app.listen(port, () => {
  console.log(`🟢 Servidor corriendo en puerto ${port}`)
})
