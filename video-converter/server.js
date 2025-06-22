require('dotenv').config()
console.log('ENV:', process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
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

  ffmpeg(originalPath).setFfmpegPath(ffmpegPath)
    .outputOptions([
      '-vcodec libx264',
      '-crf 28',
      '-preset veryfast'
    ])
    .save(compressedPath)
    .on('end', async () => {
      try {
        const buffer = fs.readFileSync(compressedPath)

        const filePath = 'temporales/' + req.file.filename
        const { error } = await supabase.storage
          .from('videos')
          .upload(filePath, buffer, {
            contentType: 'video/mp4',
            upsert: true
          })

        fs.unlinkSync(originalPath)
        fs.unlinkSync(compressedPath)

        if (error) {
          console.error('Error al subir:', error)
          return res.status(500).send('Error al subir a Supabase')
        }

        const { data } = supabase.storage.from('videos').getPublicUrl(filePath)
        return res.json({ url: data.publicUrl })
      } catch (err) {
        console.error('Error inesperado:', err)
        res.status(500).send('Error interno del servidor')
      }
    })
    .on('error', err => {
      console.error('Error al comprimir:', err)
      res.status(500).send('Error al comprimir el video')
    })
})

app.listen(port, () => console.log(`Servidor en http://localhost:${port}`))
