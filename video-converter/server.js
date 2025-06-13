const express = require('express')
const multer = require('multer')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const port = process.env.PORT || 3000

const upload = multer({ dest: 'uploads/' })

// Configuración Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

app.post('/convert', upload.single('video'), (req, res) => {
  const inputPath = req.file.path
  const outputPath = `uploads/converted-${Date.now()}.mp4`

  ffmpeg(inputPath)
    .outputOptions('-preset fast', '-movflags +faststart', '-vf scale=640:-1')
    .toFormat('mp4')
    .on('end', async () => {
      try {
        const data = fs.readFileSync(outputPath)
        const fileName = `videos/${Date.now()}.mp4`

        const { error } = await supabase.storage
          .from('videos')
          .upload(fileName, data, {
            contentType: 'video/mp4'
          })

        fs.unlinkSync(inputPath)
        fs.unlinkSync(outputPath)

        if (error) return res.status(500).send('Error al subir a Supabase')
        res.send({ status: 'ok', file: fileName })
      } catch (err) {
        res.status(500).send('Error procesando video')
      }
    })
    .on('error', (err) => {
      res.status(500).send('Error en la conversión')
    })
    .save(outputPath)
})

app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`)
})
