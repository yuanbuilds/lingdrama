import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, created, now, badRequest } from '../utils/response.js'
import { generateImage } from '../services/image-generation.js'
import { logTaskError, logTaskPayload, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { getAuth } from '../security/auth.js'

function localResultUrl(value?: string | null) {
  if (!value) return null
  return value.startsWith('/') ? value : `/${value}`
}

function publicImage(row: typeof schema.imageGenerations.$inferSelect) {
  return {
    id: row.id,
    storyboardId: row.storyboardId,
    dramaId: row.dramaId,
    sceneId: row.sceneId,
    characterId: row.characterId,
    propId: row.propId,
    imageType: row.imageType,
    frameType: row.frameType,
    prompt: row.prompt,
    model: row.model,
    provider: row.provider,
    size: row.size,
    imageUrl: localResultUrl(row.localPath),
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

// POST /images — Generate image
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.prompt) return badRequest(c, 'prompt is required')

  try {
    let configId: number | undefined = body.config_id
    if (body.storyboard_id) {
      const [sb] = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, Number(body.storyboard_id))).all()
      if (sb) {
        const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, sb.episodeId)).all()
        if (ep?.imageConfigId != null) configId = ep.imageConfigId
      }
    }

    logTaskStart('ImageAPI', 'generate', {
      storyboardId: body.storyboard_id,
      sceneId: body.scene_id,
      characterId: body.character_id,
      dramaId: body.drama_id,
      frameType: body.frame_type,
    })
    logTaskPayload('ImageAPI', 'request body', body)
    const id = await generateImage({
      storyboardId: body.storyboard_id,
      dramaId: body.drama_id,
      sceneId: body.scene_id,
      characterId: body.character_id,
      prompt: body.prompt,
      model: body.model,
      size: body.size,
      referenceImages: body.reference_images,
      frameType: body.frame_type,
      configId,
    })

    const [record] = db.select().from(schema.imageGenerations)
      .where(eq(schema.imageGenerations.id, id)).all()
    logTaskSuccess('ImageAPI', 'generate', { generationId: id, provider: record?.provider })
    return created(c, record ? publicImage(record) : null)
  } catch (err: any) {
    logTaskError('ImageAPI', 'generate', { error: err.message })
    return badRequest(c, err.message)
  }
})

// GET /images/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = db.select().from(schema.imageGenerations)
    .where(eq(schema.imageGenerations.id, id)).all()
  return success(c, row ? publicImage(row) : null)
})

// GET /images — List by storyboard_id or drama_id
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
  let rows = db.select().from(schema.imageGenerations).all()
    .filter(row => (row.dramaId != null && dramaIds.has(row.dramaId))
      || (row.storyboardId != null && storyboardIds.has(row.storyboardId)))

  if (storyboardId) rows = rows.filter(r => r.storyboardId === Number(storyboardId))
  if (dramaId) rows = rows.filter(r => r.dramaId === Number(dramaId))

  return success(c, rows.map(publicImage))
})

// DELETE /images/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  db.delete(schema.imageGenerations).where(eq(schema.imageGenerations.id, id)).run()
  return success(c)
})

export default app
