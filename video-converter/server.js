// server.js
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
const fetch = require('node-fetch')

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
app.use(cors())

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

app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: 'No se proporcionó un archivo.' })
    }

    const outputPath = path.join('uploads', 'compressed_' + file.filename)

    await new Promise((resolve, reject) => {
      ffmpeg(file.path)
        .videoCodec('libx264')
        .size('?x720')
        .outputOptions('-preset', 'ultrafast')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath)
    })

    const videoBuffer = fs.readFileSync(outputPath)

    const finalName = `${Date.now()}_${file.originalname}`
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`temporales/${finalName}`, videoBuffer, {
        contentType: file.mimetype,
      })

    if (error) {
      throw error
    }

    const { error: insertError } = await supabase.from('videos').insert([
      {
        url: `https://${process.env.SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/videos/temporales/${finalName}`,
        start_date: startDate,
        end_date: endDate,
      },
    ])

    if (insertError) {
      throw insertError
    }

    fs.unlinkSync(file.path)
    fs.unlinkSync(outputPath)

    res.json({ message: 'Subida exitosa', finalName })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
})
