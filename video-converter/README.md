# Video Converter para Supabase

Este servicio convierte videos a MP4 optimizados usando FFmpeg y los sube automáticamente a Supabase Storage.

## Endpoints

### POST `/convert`

Sube un video y lo convierte.

**Body (form-data):**
- `video`: archivo `.mp4`, `.mov`, etc.

**Response:**

```json
{
  "status": "ok",
  "file": "videos/168660123.mp4"
}
