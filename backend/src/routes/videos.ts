import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, created, badRequest } from '../utils/response.js'
import { generateVideo } from '../services/video-generation.js'
import { logTaskError, logTaskPayload, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { getAuth } from '../security/auth.js'

function localResultUrl(value?: string | null) {
  if (!value) return null
  return value.startsWith('/') ? value : `/${value}`
}

function publicVideo(row: typeof schema.videoGenerations.$inferSelect) {
  return {
    id: row.id,
    storyboardId: row.storyboardId,
    dramaId: row.dramaId,
    prompt: row.prompt,
    model: row.model,
    provider: row.provider,
    referenceMode: row.referenceMode,
    duration: row.duration,
    fps: row.fps,
    resolution: row.resolution,
    aspectRatio: row.aspectRatio,
    style: row.style,
    motionLevel: row.motionLevel,
    cameraMotion: row.cameraMotion,
    videoUrl: localResultUrl(row.localPath),
    localPath: localResultUrl(row.localPath),
    status: row.status,
    errorMsg: row.errorMsg,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  }
}

const app = new Hono()

// POST /videos — Generate video
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.prompt) return badRequest(c, 'prompt is required')

  try {
    let configId: number | undefined = body.config_id
    if (body.storyboard_id) {
      const [sb] = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, Number(body.storyboard_id))).all()
      if (sb) {
        const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, sb.episodeId)).all()
        if (ep?.videoConfigId != null) configId = ep.videoConfigId
      }
    }

    logTaskStart('VideoAPI', 'generate', {
      storyboardId: body.storyboard_id,
      dramaId: body.drama_id,
      referenceMode: body.reference_mode,
      duration: body.duration,
    })
    logTaskPayload('VideoAPI', 'request body', body)
    const id = await generateVideo({
      storyboardId: body.storyboard_id,
      dramaId: body.drama_id,
      prompt: body.prompt,
      model: body.model,
      referenceMode: body.reference_mode,
      imageUrl: body.image_url,
      firstFrameUrl: body.first_frame_url,
      lastFrameUrl: body.last_frame_url,
      referenceImageUrls: body.reference_image_urls,
      duration: body.duration,
      aspectRatio: body.aspect_ratio,
      configId,
    })

    const [record] = db.select().from(schema.videoGenerations)
      .where(eq(schema.videoGenerations.id, id)).all()
    logTaskSuccess('VideoAPI', 'generate', { generationId: id, provider: record?.provider })
    return created(c, record ? publicVideo(record) : null)
  } catch (err: any) {
    logTaskError('VideoAPI', 'generate', { error: err.message })
    return badRequest(c, err.message)
  }
})

// GET /videos/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = db.select().from(schema.videoGenerations)
    .where(eq(schema.videoGenerations.id, id)).all()
  return success(c, row ? publicVideo(row) : null)
})

// GET /videos — List by storyboard_id or drama_id
app.get('/', async (c) => {
  const storyboardId = c.req.query('storyboard_id')
  const dramaId = c.req.query('drama_id')

  const auth = getAuth(c)
  const dramaIds = new Set(db.select().from(schema.dramas)
    .where(eq(schema.dramas.workspaceId, auth.workspace.id)).all().map(row => row.id))
  const episodeIds = new Set(db.select().from(schema.episodes).all()
    .filter(row => dramaIds.has(row.dramaId) && !row.deletedAt).map(row => row.id))
  const storyboardIds = new Set(db.select().from(schema.storyboards).all()
    .filter(row => episodeIds.has(row.episodeId) && !row.deletedAt).map(row => row.id))
  let rows = db.select().from(schema.videoGenerations).all()
    .filter(row => (row.dramaId != null && dramaIds.has(row.dramaId))
      || (row.storyboardId != null && storyboardIds.has(row.storyboardId)))

  if (storyboardId) rows = rows.filter(r => r.storyboardId === Number(storyboardId))
  if (dramaId) rows = rows.filter(r => r.dramaId === Number(dramaId))

  return success(c, rows.map(publicVideo))
})

// DELETE /videos/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  db.delete(schema.videoGenerations).where(eq(schema.videoGenerations.id, id)).run()
  return success(c)
})

export default app
