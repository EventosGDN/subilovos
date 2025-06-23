require('dotenv').config({ path: './video-converter/.env' })

const express = require('express')
const cors = require('cors')
const multer = require('multer')
const { createClient } = require('@supabase/supabase-js')
const ffmpegPath = require('ffmpeg-static')
const ffmpeg = require('fluent-ffmpeg')
const fs = require('fs')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}))

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

app.post('/upload', upload.single('video'), async (req, res) => {
  const { start_date, end_date } = req.body
  const file = req.file

  if (!file) return res.status(400).send('No file uploaded.')

  const { data, error } = await supabase.storage
    .from('videos')
    .upload(`temporales/${file.filename}`, fs.createReadStream(file.path), {
      contentType: 'video/mp4',
      duplex: 'half',
    })

  fs.unlinkSync(file.path)

  if (error) {
    console.error('Error uploading to Supabase:', error)
    return res.status(500).send('Upload failed.')
  }

  const { data: publicUrlData } = supabase
    .storage
    .from('videos')
    .getPublicUrl(`temporales/${file.filename}`)

  await supabase.from('videos').insert({
    url: publicUrlData.publicUrl,
    start_date,
    end_date
  })

  res.send({ success: true, url: publicUrlData.publicUrl })
})

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
})
