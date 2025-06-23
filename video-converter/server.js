require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 8080;

// CORS manual para permitir origenes externos (Vercel)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // ¡Cambiar '*' por tu dominio en producción!
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
  })
});

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
          console.error('Supabase error:', error);
          return res.status(500).json({ error: 'Error al subir a Supabase' });
        }

        const { data } = supabase.storage.from('videos').getPublicUrl(filePath);
        res.json({ url: data.publicUrl });
      } catch (e) {
        console.error('Error interno:', e);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    })
    .on('error', err => {
      console.error('FFmpeg error:', err);
      res.status(500).json({ error: 'Error comprimiendo el video' });
    });
});

app.listen(port, () => console.log(`Servidor corriendo en puerto ${port}`));
