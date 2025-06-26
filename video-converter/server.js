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
const fetch = require('node-fetch')
const webpush = require('web-push')

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
const port = process.env.PORT || 3000

app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://subilovos.vercel.app')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

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

const subscriptions = []

webpush.setVapidDetails(
  'mailto:tu@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

app.post('/api/save-subscription', express.json(), (req, res) => {
  const subscription = req.body
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida' })
  }
  subscriptions.push(subscription)
  res.status(201).json({ message: 'Suscripción guardada' })
})

app.post('/upload', upload.single('video'), async (req, res) => {
  const { start, end } = req.body
  const file = req.file

  if (!file || !start || !end) {
    return res.status(400).send('Faltan datos.')
  }

  const timestamp = Date.now()
  const finalName = `${timestamp}_${file.originalname}`
  const originalPath = file.path
  const cloudPath = `temporales/${finalName}`
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/videos/${cloudPath}`

  try {
    const videoData = fs.readFileSync(originalPath)

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(cloudPath, videoData, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      console.error('❌ Error subiendo a storage:', uploadError)
      return res.status(500).json({ error: 'Error al subir el video.' })
    }

    const { error: insertError } = await supabase.from('videos').insert([{
      name: finalName,
      url: publicUrl,
      start_date: start,
      end_date: end,
      status: 'pending'
    }])

    if (insertError) {
      console.error('❌ Error insertando en tabla:', insertError)
      return res.status(500).json({ error: 'Error al insertar en tabla.' })
    }

    res.status(200).json({ url: publicUrl, finalName })

    const outputPath = `uploads/compressed_${finalName}`

    ffmpeg(originalPath)
      .outputOptions('-b:v 1000k')
      .save(outputPath)
      .on('end', async () => {
        try {
          const compressedData = fs.readFileSync(outputPath)

          await supabase.storage.from('videos').update(cloudPath, compressedData, {
            contentType: 'video/mp4'
          })

          await supabase.from('videos').update({ status: 'ready' }).eq('name', finalName)

          fs.unlinkSync(originalPath)
          fs.unlinkSync(outputPath)

          const payload = JSON.stringify({
            title: '¡Video listo!',
            body: 'Tu video se comprimió y cargó correctamente.'
          })

          for (const sub of subscriptions) {
            webpush.sendNotification(sub, payload).catch(err => {
              console.error('❌ Push error:', err)
            })
          }

          console.log(`✅ Comprimido y notificado: ${finalName}`)
        } catch (err) {
          console.error('❌ Error post-compresión:', err)
        }
      })
      .on('error', err => {
        console.error('❌ FFMPEG error:', err)
      })

  } catch (e) {
    console.error('❌ Error en /upload:', e)
  }
})

app.delete('/delete', express.json(), async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Falta nombre' })

  try {
    const path = `temporales/${name}`
    await supabase.storage.from('videos').remove([path])
    await supabase.from('videos').delete().eq('name', name)
    res.status(200).json({ message: '✅ Eliminado' })
  } catch (err) {
    console.error('❌ Borrado error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.listen(port, () => {
  console.log(`🚀 Servidor en http://localhost:${port}`)
})
