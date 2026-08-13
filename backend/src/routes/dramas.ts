import { Hono } from 'hono'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest, notFound, created, now } from '../utils/response.js'
import { toSnakeCase, toSnakeCaseArray } from '../utils/transform.js'
import { getAuth, getAuthOrNull } from '../security/auth.js'
import {
  publicCharacterRecord,
  publicDramaRecord,
  publicEpisodeRecord,
  publicPropRecord,
  publicSceneRecord,
  publicStoryboardRecord,
} from '../security/public-production.js'

const app = new Hono()

const IMMUTABLE_NESTED_FIELDS = new Set([
  'dramaId', 'drama_id', 'createdAt', 'created_at', 'updatedAt', 'updated_at',
  'deletedAt', 'deleted_at', 'localPath', 'local_path',
])

function hasImmutableNestedField(value: Record<string, unknown>, allowId = false) {
  return Object.keys(value).some(key => (!allowId && key === 'id') || IMMUTABLE_NESTED_FIELDS.has(key))
}

function characterValues(input: Record<string, any>) {
  const values: Record<string, any> = {}
  const fields = [
    'name', 'role', 'description', 'appearance', 'personality', 'voiceStyle',
    'seedValue', 'sortOrder', 'voiceProvider',
  ]
  for (const field of fields) {
    const snake = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    const value = field in input ? input[field] : input[snake]
    if (value !== undefined) {
      values[field] = field === 'referenceImages' && Array.isArray(value)
        ? JSON.stringify(value)
        : value
    }
  }
  return values
}

function episodeValues(input: Record<string, any>) {
  const values: Record<string, any> = {}
  const fields = [
    'episodeNumber', 'title', 'content', 'scriptContent', 'description', 'duration',
    'status', 'imageConfigId', 'videoConfigId', 'audioConfigId',
  ]
  for (const field of fields) {
    const snake = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
    const value = field in input ? input[field] : input[snake]
    if (value !== undefined) values[field] = value
  }
  return values
}

// GET /dramas - List dramas
app.get('/', async (c) => {
  const page = Number(c.req.query('page') || 1)
  const pageSize = Number(c.req.query('page_size') || 20)
  const status = c.req.query('status')
  const keyword = c.req.query('keyword')

  const auth = getAuthOrNull(c)
  let query = db.select().from(schema.dramas).where(auth
    ? and(isNull(schema.dramas.deletedAt), eq(schema.dramas.workspaceId, auth.workspace.id))
    : and(isNull(schema.dramas.deletedAt), eq(schema.dramas.isPublic, true)))

  const allRows = await query.orderBy(desc(schema.dramas.updatedAt))
  let filtered = allRows

  if (status) filtered = filtered.filter(d => d.status === status)
  if (keyword) filtered = filtered.filter(d => d.title.includes(keyword))

  const total = filtered.length
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)

  // Attach episode/character/scene counts
  const enriched = await Promise.all(items.map(async (drama) => {
    const eps = await db.select().from(schema.episodes)
      .where(and(eq(schema.episodes.dramaId, drama.id), isNull(schema.episodes.deletedAt)))
    const chars = await db.select().from(schema.characters)
      .where(and(eq(schema.characters.dramaId, drama.id), isNull(schema.characters.deletedAt)))
    const scns = await db.select().from(schema.scenes)
      .where(and(eq(schema.scenes.dramaId, drama.id), isNull(schema.scenes.deletedAt)))
    const episodeIds = new Set(eps.map(ep => ep.id))
    const storyboards = db.select().from(schema.storyboards).all()
      .filter(storyboard => episodeIds.has(storyboard.episodeId) && !storyboard.deletedAt)
    const merges = db.select().from(schema.videoMerges).all()
      .filter(merge => merge.dramaId === drama.id && !merge.deletedAt)
    const latestMerge = merges.at(-1)
    const previewStoryboard = [...storyboards].reverse().find(storyboard => (
      storyboard.composedImage || storyboard.firstFrameImage || storyboard.lastFrameImage
    ))
    const previewVideoStoryboard = [...storyboards].reverse().find(storyboard => (
      storyboard.composedVideoUrl || storyboard.videoUrl
    ))
    return {
      ...(auth ? toSnakeCase(drama) : publicDramaRecord(drama)),
      tags: drama.tags ? JSON.parse(drama.tags) : [],
      total_episodes: eps.length,
      episodes: auth ? toSnakeCaseArray(eps) : eps.map(publicEpisodeRecord),
      characters: auth ? toSnakeCaseArray(chars) : chars.map(publicCharacterRecord),
      scenes: auth ? toSnakeCaseArray(scns) : scns.map(publicSceneRecord),
      preview_image: drama.thumbnail || previewStoryboard?.composedImage || previewStoryboard?.firstFrameImage || previewStoryboard?.lastFrameImage || null,
      preview_video: latestMerge?.mergedUrl || previewVideoStoryboard?.composedVideoUrl || previewVideoStoryboard?.videoUrl || null,
      production_summary: {
        shots: storyboards.length,
        images_ready: storyboards.filter(storyboard => Boolean(storyboard.composedImage || storyboard.firstFrameImage)).length,
        videos_ready: storyboards.filter(storyboard => Boolean(storyboard.composedVideoUrl || storyboard.videoUrl)).length,
        final_ready: latestMerge?.status === 'completed',
      },
    }
  }))

  return success(c, {
    items: enriched,
    pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
  })
})

// POST /dramas - Create drama
app.post('/', async (c) => {
  const auth = getAuth(c)
  const body = await c.req.json()
  const ts = now()
  const res = db.insert(schema.dramas).values({
    workspaceId: auth.workspace.id,
    createdBy: auth.user.id,
    title: body.title,
    description: body.description,
    genre: body.genre,
    style: body.style,
    tags: body.tags ? JSON.stringify(body.tags) : null,
    metadata: body.metadata,
    status: 'draft',
    createdAt: ts,
    updatedAt: ts,
  }).run()

  const [result] = db.select().from(schema.dramas)
    .where(eq(schema.dramas.id, Number(res.lastInsertRowid))).all()

  // Create default episodes
  const totalEpisodes = body.total_episodes || 1
  for (let i = 1; i <= totalEpisodes; i++) {
    db.insert(schema.episodes).values({
      dramaId: result.id,
      episodeNumber: i,
      title: `第${i}集`,
      status: 'draft',
      createdAt: ts,
      updatedAt: ts,
    }).run()
  }

  return created(c, toSnakeCase(result))
})


// GET /dramas/stats — must be before /:id
app.get('/stats', async (c) => {
  const auth = getAuth(c)
  const all = db.select().from(schema.dramas).where(and(
    isNull(schema.dramas.deletedAt),
    eq(schema.dramas.workspaceId, auth.workspace.id),
  )).all()
  const byStatus = Object.entries(
    all.reduce((acc, d) => {
      acc[d.status || 'draft'] = (acc[d.status || 'draft'] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([status, count]) => ({ status, count }))
  return success(c, { total: all.length, by_status: byStatus })
})

// GET /dramas/:id - Get drama detail
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const auth = getAuthOrNull(c)
  const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, id))
  if (!drama) return notFound(c, '剧本不存在')

  const eps = await db.select().from(schema.episodes)
    .where(and(eq(schema.episodes.dramaId, id), isNull(schema.episodes.deletedAt)))
  const chars = await db.select().from(schema.characters)
    .where(and(eq(schema.characters.dramaId, id), isNull(schema.characters.deletedAt)))
  const scns = await db.select().from(schema.scenes)
    .where(and(eq(schema.scenes.dramaId, id), isNull(schema.scenes.deletedAt)))
  const prps = await db.select().from(schema.props)
    .where(and(eq(schema.props.dramaId, id), isNull(schema.props.deletedAt)))
  const episodeIds = new Set(eps.map(ep => ep.id))
  const storyboards = db.select().from(schema.storyboards).all()
    .filter(storyboard => episodeIds.has(storyboard.episodeId) && !storyboard.deletedAt)
  const merges = db.select().from(schema.videoMerges).all()
    .filter(merge => merge.dramaId === id && !merge.deletedAt)
  const latestMerge = merges.at(-1)
  const previewStoryboard = [...storyboards].reverse().find(storyboard => (
    storyboard.composedImage || storyboard.firstFrameImage || storyboard.lastFrameImage
  ))
  const previewVideoStoryboard = [...storyboards].reverse().find(storyboard => (
    storyboard.composedVideoUrl || storyboard.videoUrl
  ))

  return success(c, {
    ...(auth ? toSnakeCase(drama) : publicDramaRecord(drama)),
    tags: drama.tags ? JSON.parse(drama.tags) : [],
    episodes: auth ? toSnakeCaseArray(eps) : eps.map(publicEpisodeRecord),
    characters: auth ? toSnakeCaseArray(chars) : chars.map(publicCharacterRecord),
    scenes: auth ? toSnakeCaseArray(scns) : scns.map(publicSceneRecord),
    props: auth ? toSnakeCaseArray(prps) : prps.map(publicPropRecord),
    preview_image: drama.thumbnail || previewStoryboard?.composedImage || previewStoryboard?.firstFrameImage || previewStoryboard?.lastFrameImage || null,
    preview_video: latestMerge?.mergedUrl || previewVideoStoryboard?.composedVideoUrl || previewVideoStoryboard?.videoUrl || null,
    storyboards: auth ? toSnakeCaseArray(storyboards) : storyboards.map(publicStoryboardRecord),
    production_summary: {
      shots: storyboards.length,
      images_ready: storyboards.filter(storyboard => Boolean(storyboard.composedImage || storyboard.firstFrameImage)).length,
      videos_ready: storyboards.filter(storyboard => Boolean(storyboard.composedVideoUrl || storyboard.videoUrl)).length,
      final_ready: latestMerge?.status === 'completed',
    },
  })
})

// PUT /dramas/:id - Update drama
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const updates: Record<string, any> = { updatedAt: now() }
  if (body.title !== undefined) updates.title = body.title
  if (body.description !== undefined) updates.description = body.description
  if (body.genre !== undefined) updates.genre = body.genre
  if (body.style !== undefined) updates.style = body.style
  if (body.status !== undefined) updates.status = body.status
  if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
  if (body.metadata !== undefined) updates.metadata = body.metadata
  db.update(schema.dramas).set(updates).where(eq(schema.dramas.id, id)).run()
  return success(c)
})

// DELETE /dramas/:id - Soft delete
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  db.update(schema.dramas).set({ deletedAt: now() }).where(eq(schema.dramas.id, id)).run()
  return success(c)
})

// PUT /dramas/:id/characters - Save characters
app.put('/:id/characters', async (c) => {
  const dramaId = Number(c.req.param('id'))
  const body = await c.req.json()
  const chars = body.characters || []
  const ts = now()

  for (const char of chars) {
    if (!char || typeof char !== 'object' || hasImmutableNestedField(char, Boolean(char.id))) {
      return badRequest(c, 'Immutable character fields cannot be changed')
    }
    const values = characterValues(char)
    if (char.id) {
      const existing = db.select().from(schema.characters).where(eq(schema.characters.id, char.id)).get()
      if (!existing || existing.dramaId !== dramaId) return badRequest(c, 'Character does not belong to this project')
      if (!Object.keys(values).length) return badRequest(c, 'No valid character fields')
      db.update(schema.characters).set({ ...values, updatedAt: ts }).where(eq(schema.characters.id, char.id)).run()
    } else {
      if (!values.name) return badRequest(c, 'Character name is required')
      db.insert(schema.characters).values({
        ...values,
        name: values.name,
        dramaId,
        createdAt: ts,
        updatedAt: ts,
      } as typeof schema.characters.$inferInsert).run()
    }
  }
  return success(c)
})

// PUT /dramas/:id/episodes - Save episodes
app.put('/:id/episodes', async (c) => {
  const dramaId = Number(c.req.param('id'))
  const body = await c.req.json()
  const episodes = body.episodes || []
  const ts = now()

  for (const ep of episodes) {
    if (!ep || typeof ep !== 'object' || hasImmutableNestedField(ep, Boolean(ep.id))) {
      return badRequest(c, 'Immutable episode fields cannot be changed')
    }
    const values = episodeValues(ep)
    if (ep.id) {
      const existing = db.select().from(schema.episodes).where(eq(schema.episodes.id, ep.id)).get()
      if (!existing || existing.dramaId !== dramaId) return badRequest(c, 'Episode does not belong to this project')
      if (!Object.keys(values).length) return badRequest(c, 'No valid episode fields')
      db.update(schema.episodes).set({ ...values, updatedAt: ts }).where(eq(schema.episodes.id, ep.id)).run()
    } else {
      db.insert(schema.episodes).values({
        ...values,
        dramaId,
        episodeNumber: values.episodeNumber || 1,
        title: values.title || '未命名',
        createdAt: ts,
        updatedAt: ts,
      } as typeof schema.episodes.$inferInsert).run()
    }
  }
  return success(c)
})

export default app
