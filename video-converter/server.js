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

// Habilita CORS SOLO para tu front
app.use(cors({
  origin: 'https://subilovos.vercel.app'
}))

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
})
const upload = multer({ storage })

app.post('/upload', upload.single('video'), async (req, res) => {
  const { start, end } = req.body
  const inputPath = req.file.path
  const outputFilename = Date.now() + '_converted.mp4'
  const outputPath = path.join('converted', outputFilename)

  ffmpeg.setFfmpegPath(ffmpegPath)

  ffmpeg(inputPath)
    .outputOptions('-movflags frag_keyframe+empty_moov') // necesario para streaming
    .save(outputPath)
    .on('end', async () => {
      const fileData = fs.readFileSync(outputPath)
      const { data, error } = await supabase.storage
        .from('videos')
        .upload('temporales/' + outputFilename, fileData, {
          contentType: 'video/mp4',
          upsert: false
        })

      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      const publicURL = `https://wqrkkkqmbrksleagqsli.supabase.co/storage/v1/object/public/videos/temporales/${outputFilename}`
      return res.json({ url: publicURL, start, end })
    })
    .on('error', err => {
      fs.unlinkSync(inputPath)
      return res.status(500).json({ error: err.message })
    })
})

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
})
