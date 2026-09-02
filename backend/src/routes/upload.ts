import { Hono } from 'hono'
import { success, badRequest } from '../utils/response.js'
import { saveUploadedFile } from '../utils/storage.js'
import sharp from 'sharp'
import { db, schema } from '../db/index.js'
import { getAuth } from '../security/auth.js'
import { now } from '../utils/response.js'

const app = new Hono()
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_IMAGE_PIXELS = 50_000_000
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const FORMAT_EXTENSION: Record<string, string> = { jpeg: '.jpg', png: '.png', webp: '.webp' }
const FORMAT_MIME: Record<string, string> = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

// POST /upload/image
app.post('/image', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return badRequest(c, 'file is required')
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    return badRequest(c, `image must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes`)
  }
  if (!ACCEPTED_MIME_TYPES.has(file.type.toLowerCase())) {
    return badRequest(c, 'only JPEG, PNG and WebP images are accepted')
  }

  const buffer = await file.arrayBuffer()
  let metadata: sharp.Metadata
  try {
    metadata = await sharp(Buffer.from(buffer), { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS }).metadata()
  } catch {
    return badRequest(c, 'invalid or oversized image')
  }
  const extension = metadata.format ? FORMAT_EXTENSION[metadata.format] : undefined
  if (
    !extension
    || !metadata.format
    || FORMAT_MIME[metadata.format] !== file.type.toLowerCase()
    || !metadata.width
    || !metadata.height
    || metadata.width * metadata.height > MAX_IMAGE_PIXELS
  ) {
    return badRequest(c, 'invalid or unsupported image')
  }
  const path = await saveUploadedFile(buffer, 'uploads', `upload${extension}`)
  const auth = getAuth(c)
  db.insert(schema.mediaObjects).values({
    workspaceId: auth.workspace.id,
    userId: auth.user.id,
    path,
    mimeType: FORMAT_MIME[metadata.format],
    sizeBytes: file.size,
    createdAt: now(),
  }).run()
  return success(c, { url: `/${path}`, path })
})

export default app
