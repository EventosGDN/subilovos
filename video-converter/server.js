require('dotenv').config(); // carga variables .env local/prod

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 8080;

// 🚧 Habilitar CORS desde cualquier origen (ajustar en producción)
app.use(cors({
  origin: ['https://subilovos.vercel.app', /\.vercel\.app$/],
  methods: ['GET', 'POST', 'OPTIONS'],
}));

// Responder preflight OPTIONS para cualquier ruta
app.options('*', cors());

// Parse JSON
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Multer setup
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}_${file.originalname}`)
  })
});

// Endpoint de subida
app.post('/upload', upload.single('video'), (req, res) => {
  const originalPath = req.file.path;
  const compressedPath = `uploads/compressed_${req.file.filename}`;

  ffmpeg(originalPath)
    .setFfmpegPath(ffmpegPath)
    .outputOptions(['-vcodec libx264', '-crf 28', '-preset veryfast'])
    .save(compressedPath)
    .on('end', async () => {
      try {
        const buffer = fs.readFileSync(compressedPath);
        const filePath = `temporales/${req.file.filename}`;
        const { error } = await supabase
          .storage.from('videos')
          .upload(filePath, buffer, {
            contentType: 'video/mp4',
            upsert: true
          });

        fs.unlinkSync(originalPath);
        fs.unlinkSync(compressedPath);

        if (error) {
          console.error('Supabase upload error:', error);
          return res.status(500).json({ error: 'Error al subir a Supabase' });
        }

        const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
        res.json({ url: data.publicUrl });
      } catch (e) {
        console.error('Error interno:', e);
        res.status(500).json({ error: 'Error interno' });
      }
    })
    .on('error', err => {
      console.error('Error en compresión:', err);
      res.status(500).json({ error: 'Error comprimiendo video' });
    });
});

// Ruta de healthcheck para Railway/Verificación
app.get('/healthz', (req, res) => res.sendStatus(200));

// Error handler que agrega CORS a respuestas de error
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500)
    .set({
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    .json({ error: 'Error no controlado' });
});

app.listen(port, () => console.log(`Servidor corriendo en puerto ${port}`));
