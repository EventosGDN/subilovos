// server.js

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 8080;

// CORS configuración
const allowedOrigins = ['https://subilovos.vercel.app']; // agrega más dominios si tenés
app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.options('*', cors()); // responde preflight OPTIONS :contentReference[oaicite:1]{index=1}

console.log('🔥 CORS habilitado para', allowedOrigins.join(', '));

app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

app.post('/upload', upload.single('video'), async (req, res) => {
  const originalPath = req.file.path;
  const compressedPath = 'uploads/compressed_' + req.file.filename;

  ffmpeg(originalPath)
    .setFfmpegPath(ffmpegPath)
    .outputOptions(['-vcodec libx264', '-crf 28', '-preset veryfast'])
    .save(compressedPath)
    .on('end', async () => {
      try {
        const buffer = fs.readFileSync(compressedPath);
        const filePath = 'temporales/' + req.file.filename;

        const { error } = await supabase.storage
          .from('videos')
          .upload(filePath, buffer, {
            contentType: 'video/mp4',
            upsert: true
          });

        fs.unlinkSync(originalPath);
        fs.unlinkSync(compressedPath);

        if (error) {
          console.error('Error al subir a Supabase:', error);
          return res.status(500).send('Error al subir a Supabase');
        }

        const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
        return res.json({ url: data.publicUrl });
      } catch (err) {
        console.error('Error inesperado:', err);
        res.status(500).send('Error interno del servidor');
      }
    })
    .on('error', err => {
      console.error('Error al comprimir:', err);
      res.status(500).send('Error al comprimir el video');
    });
});

app.listen(port, () => console.log(`Servidor escuchando en puerto ${port}`));
