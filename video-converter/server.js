if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './video-converter/.env' })
}

const ffmpegPath = require('ffmpeg-static')
const express = require('express')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const ffmpeg = require('fluent-ffmpeg')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

// Configuración CORS
app.use(cors({
  origin: '*', // o reemplazá con tu frontend: 'https://subilovos.vercel.app'
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}))

// Fallback manual para preflight OPTIONS
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.sendStatus(200)
})

// Middlewares
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Multer para manejar archivos temporales
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// Ruta para subir videos
app.post('/upload', upload.single('video'), async (req, res) => {
  try {
    const { startDate, endDate } = req.body
    const originalPath = req.file.path
    const outputPath = 'uploads/' + 'converted_' + req.file.filename

    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .setFfmpegPath(ffmpegPath)
        .outputOptions('-preset', 'ultrafast')
        .save(outputPath)
        .on('end', resolve)
        .on('error', reject)
    })

    const fileData = fs.readFileSync(outputPath)
    const { data, error } = await supabase
      .storage
      .from('videos')
      .upload(`temporales/${Date.now()}_${req.file.originalname}`, fileData, {
        contentType: 'video/mp4'
      })

    fs.unlinkSync(originalPath)
    fs.unlinkSync(outputPath)

    if (error) {
      console.error('Error al subir a Supabase:', error)
      return res.status(500).json({ error: 'Error al subir el video a Supabase.' })
    }

    const urlPublica = `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${data.path}`

    const insert = await supabase
      .from('videos')
      .insert([{ url: urlPublica, start_date: startDate, end_date: endDate }])

    if (insert.error) {
      console.error('Error al insertar en tabla videos:', insert.error)
      return res.status(500).json({ error: 'Error al registrar el video en la base de datos.' })
    }

    res.status(200).json({ success: true, url: urlPublica })

  } catch (err) {
    console.error('Error en /upload:', err)
    res.status(500).json({ error: 'Error en el procesamiento del video.' })
  }
})

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
})
