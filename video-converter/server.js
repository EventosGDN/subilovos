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

app.use(cors())
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Multer config
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

// Endpoint raíz
app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// Procesar metadata después de upload desde frontend
app.post('/procesar', async (req, res) => {
  const { name, url, start, end } = req.body

  if (!name || !url || !start || !end) {
    return res.status(400).json({ error: 'Faltan datos' })
  }

  try {
    await supabase.from('videos').insert([{
      name,
      url,
      start_date: start,
      end_date: end,
      status: 'pending'
    }])

    // Compresión y actualización
    const originalPath = `uploads/${name}`
    const outputPath = `uploads/compressed_${name}`

    ffmpeg(originalPath)
      .outputOptions('-b:v 1000k')
      .save(outputPath)
      .on('end', async () => {
        try {
          const compressed = fs.readFileSync(outputPath)

          await supabase.storage
            .from('videos')
            .update(`temporales/${name}`, compressed, {
              contentType: 'video/mp4',
            })

          await supabase
            .from('videos')
            .update({ status: 'ready' })
            .eq('name', name)

          fs.unlinkSync(originalPath)
          fs.unlinkSync(outputPath)

          console.log(`✅ Video procesado: ${name}`)
        } catch (err) {
          console.error('❌ Error post-compresión:', err)
        }
      })
      .on('error', err => {
        console.error('❌ Error al comprimir:', err)
      })

    res.status(200).json({ message: 'Metadata cargada, comenzando compresión' })
  } catch (err) {
    console.error('❌ Error en /procesar:', err)
    res.status(500).json({ error: 'Error al insertar metadata' })
  }
})

// Eliminar video (tabla + storage)
app.delete('/delete', async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Falta el nombre' })

  try {
    await supabase.storage.from('videos').remove([`temporales/${name}`])
    await supabase.from('videos').delete().eq('name', name)
    res.status(200).json({ message: '✅ Video eliminado' })
  } catch (err) {
    console.error('❌ Error al eliminar:', err)
    res.status(500).json({ error: 'Error al eliminar video' })
  }
})

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`)
})
