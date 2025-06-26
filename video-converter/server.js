if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './video-converter/.env' })
}

const express = require('express')
const cors = require('cors')
const { createClient } = require('@supabase/supabase-js')
const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// 🟢 Endpoint base para testeo
app.get('/', (req, res) => {
  res.send('🟢 Backend operativo')
})

// 🔵 Notificación del video subido
app.post('/procesar', async (req, res) => {
  try {
    const { name, url, start, end } = req.body

    if (!name || !url || !start || !end) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' })
    }

    const { error } = await supabase.from('videos').insert({
      name,
      url,
      start_date: start,
      end_date: end,
      status: 'ready' // Cambiar a 'pending' si luego hacés compresión
    })

    if (error) {
      console.error('Error al insertar en tabla videos:', error)
      return res.status(500).json({ error: 'Error al registrar en base de datos' })
    }

    res.status(200).json({ message: 'Video registrado correctamente' })
  } catch (err) {
    console.error('Error en /procesar:', err)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

// 🔴 Borrar video (desde botón rojo en el frontend)
app.delete('/delete', async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Nombre faltante' })

    const path = `temporales/${name}`

    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([path])

    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('name', name)

    if (storageError || dbError) {
      console.error('Error al borrar:', storageError || dbError)
      return res.status(500).json({ error: 'Error al borrar video' })
    }

    res.status(200).json({ message: 'Video eliminado correctamente' })
  } catch (err) {
    console.error('Error en /delete:', err)
    res.status(500).json({ error: 'Error del servidor al borrar' })
  }
})

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`)
})
