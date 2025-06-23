if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './video-converter/.env' })
}

const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')
const ffmpegPath = require('ffmpeg-static')

const app = express()
const port = process.env.PORT || 8080

// 👉 CORS antes de todo
app.use(cors({
  origin: 'https://subilovos.vercel.app',
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}))

// 👉 Inicializa Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// 👉 Asegura carpetas necesarias
const uploadDir = 'uploads'
const convertedDir = 'converted'

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)
if (!fs.existsSync(convertedDir)) fs.mkdirSync(convertedDir)

// 👉 Configura multer
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

// 👉 Ruta principal de subida
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const { start, end } = req.body
    const inputPath = req.file.path
    const outputFilename = Date.now() + '_converted.mp4'
    const outputPath = path.join(convertedDir, outputFilename)

    ffmpeg.setFfmpegPath(ffmpegPath)

    ffmpeg(inputPath)
      .outputOptions('-movflags frag_keyframe+empty_moov') // para streaming inmediato
      .save(outputPath)
      .on('end', async () => {
        try {
          const fileData = fs.readFileSync(outputPath)
          const { error } = await supabase.storage
            .from('videos')
            .upload('temporales/' + outputFilename, fileData, {
              contentType: 'video/mp4',
              upsert: false
            })

          fs.unlinkSync(inputPath)
          fs.unlinkSync(outputPath)

          if (error) return res.status(500).json({ error: error.message })

          const publicURL = `https://wqrkkkqmbrksleagqsli.supabase.co/storage/v1/object/public/videos/temporales/${outputFilename}`
          return res.json({ url: publicURL, start, end })
        } catch (err) {
          fs.unlinkSync(inputPath)
          fs.unlinkSync(outputPath)
          return res.status(500).json({ error: 'Error al subir a Supabase: ' + err.message })
        }
      })
      .on('error', err => {
        fs.unlinkSync(inputPath)
        return res.status(500).json({ error: 'Error al convertir video: ' + err.message })
      })

  } catch (err) {
    return res.status(500).json({ error: 'Error en el servidor: ' + err.message })
  }
})

// 👉 Servidor activo
app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
})
