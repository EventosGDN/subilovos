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

  // TODO: Comprimir con ffmpeg acá

  // De momento solo sube el original (luego cambiamos por compressedPath)
  const fileBuffer = fs.readFileSync(originalPath)
  const { error } = await supabase.storage
    .from('videos')
    .upload('temporales/' + req.file.filename, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true
    })

  fs.unlinkSync(originalPath)
  if (error) return res.status(500).send('Error al subir a Supabase')
  res.send('Video subido correctamente')
})

app.listen(port, () => console.log(`Servidor en http://localhost:${port}`))
