export default async function handler(req, res) {
  const { file } = req.query

  if (!file) {
    return res.status(400).send('Falta el parámetro "file"')
  }

  const url = `https://wqrkkkqmbrksleagqsli.supabase.co/storage/v1/object/public/videos/temporales/${file}`

  try {
    const response = await fetch(url, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    })

    if (!response.ok) {
      return res.status(response.status).send('No se pudo obtener el video')
    }

    const buffer = await response.arrayBuffer()
res.setHeader('Content-Type', 'video/mp4')
res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
res.end(Buffer.from(buffer))

  } catch (err) {
    res.status(500).send('Error interno')
  }
}
