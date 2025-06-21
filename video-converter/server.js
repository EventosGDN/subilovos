const ffmpegPath = require('ffmpeg-static')
const express = require('express')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

app.post('/upload', upload.single('video'), async (req, res) => {
  const originalPath = req.file.path
  const compressedPath = 'uploads/compressed_' + req.file.filename

  // Comprimir video con FFmpeg
  ffmpeg(originalPath).setFfmpegPath(ffmpegPath)
    .outputOptions([
      '-vcodec libx264',
      '-crf 28',           // Nivel de compresión (más alto = más compresión)
      '-preset veryfast'   // Velocidad del proceso (faster = menos calidad)
    ])
    .save(compressedPath)
    .on('end', async () => {
      const buffer = fs.readFileSync(compressedPath)

      const { error } = await supabase.storage
        .from('videos')
        .upload('temporales/' + req.file.filename, buffer, {
          contentType: 'video/mp4',
          upsert: true
        })

      fs.unlinkSync(originalPath)
      fs.unlinkSync(compressedPath)

      if (error) {
        console.error('Error al subir:', error)
        return res.status(500).send('Error al subir a Supabase')
      }

      res.send('Video comprimido y subido con éxito')
    })
    .on('error', err => {
      console.error('Error al comprimir:', err)
      res.status(500).send('Error al comprimir el video')
    })
})


app.listen(port, () => console.log(`Servidor en http://localhost:${port}`))
