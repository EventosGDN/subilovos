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
const fetch = require('node-fetch') // ⚠️ requerido en Railway

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
const port = process.env.PORT || 3000

// CORS
const corsOptions = {
  origin: 'https://subilovos.vercel.app',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://subilovos.vercel.app')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// Multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname),
})
const upload = multer({ storage })

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Test
app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// Upload
app.post('/upload', upload.single('video'), async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://subilovos.vercel.app')

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

  // Responder inmediatamente
  res.json({ url: publicUrl, finalName })

  try {
    const videoData = fs.readFileSync(originalPath)

    // Subir el video original sin comprimir
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(cloudPath, videoData, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) throw uploadError

    // Insertar registro en la tabla
    const { error: insertError } = await supabase
      .from('videos')
      .insert([{
        name: finalName,
        url: publicUrl,
        start_date: start,
        end_date: end,
        status: 'pending'
      }])

    if (insertError) throw insertError

    // Comprimir en segundo plano
    const outputPath = `uploads/compressed_${finalName}`

    ffmpeg(originalPath)
      .outputOptions('-b:v 1000k')
      .save(outputPath)
      .on('end', async () => {
        try {
          const compressedData = fs.readFileSync(outputPath)

          await supabase.storage
            .from('videos')
            .update(cloudPath, compressedData, {
              contentType: 'video/mp4'
            })

          await supabase
            .from('videos')
            .update({ status: 'ready' })
            .eq('name', finalName)

          fs.unlinkSync(originalPath)
          fs.unlinkSync(outputPath)
          console.log(`✅ Comprimido y actualizado: ${finalName}`)
        } catch (err) {
          console.error('❌ Error al reemplazar video comprimido:', err)
        }
      })
      .on('error', err => {
        console.error('❌ FFMPEG error:', err)
      })

  } catch (e) {
    console.error('❌ Error general en /upload:', e)
  }
})



// Delete
app.delete('/delete', express.json(), async (req, res) => {
  const { name } = req.body
  if (!name) return res.status(400).json({ error: 'Falta nombre' })

  try {
    const path = `temporales/${name}`

    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([path])

    if (storageError) throw storageError

    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('name', name)

    if (dbError) throw dbError

    res.status(200).json({ message: '✅ Eliminado' })
  } catch (err) {
    console.error('❌ Borrado error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Start server
app.listen(port, () => {
  console.log(`🚀 Servidor en http://localhost:${port}`)
})
console.log("🟢 Subilo Vos backend actualizado");

const webpush = require('web-push')

webpush.setVapidDetails(
  'mailto:tu@email.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// cuando termina de procesar el video:
const payload = JSON.stringify({
  title: '¡Video listo!',
  body: 'Tu video se comprimió y cargó correctamente.',
})


let subscriptions = [] // Por ahora guardamos en memoria (podés luego guardar en Supabase)

app.post('/api/save-subscription', express.json(), (req, res) => {
  const subscription = req.body

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida' })
  }

  subscriptions.push(subscription)
  console.log('📥 Suscripción guardada:', subscription.endpoint)
  res.status(201).json({ message: 'Suscripción guardada' })
})


for (const sub of subscriptions) {
  webpush.sendNotification(sub, payload).catch(err => {
    console.error('❌ Error al enviar push:', err)
  })
}

