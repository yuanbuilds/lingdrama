import type { Context, MiddlewareHandler } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { forbidden } from '../utils/response.js'
import { getAuth, getAuthOrNull, isPlatformAdmin } from './auth.js'

function publicDrama(dramaId: number) {
  const drama = db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId)).get()
  return Boolean(drama && !drama.deletedAt && drama.isPublic)
}

function publicEpisode(episodeId: number) {
  const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).get()
  return Boolean(episode && !episode.deletedAt && publicDrama(episode.dramaId))
}

export function dramaInWorkspace(c: Context, dramaId: number) {
  const auth = getAuth(c)
  const drama = db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId)).get()
  return Boolean(drama && !drama.deletedAt && drama.workspaceId === auth.workspace.id)
}

export function episodeInWorkspace(c: Context, episodeId: number) {
  const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).get()
  return Boolean(episode && !episode.deletedAt && dramaInWorkspace(c, episode.dramaId))
}

export function storyboardInWorkspace(c: Context, storyboardId: number) {
  const storyboard = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, storyboardId)).get()
  return Boolean(storyboard && !storyboard.deletedAt && episodeInWorkspace(c, storyboard.episodeId))
}

export function characterInWorkspace(c: Context, characterId: number) {
  const character = db.select().from(schema.characters).where(eq(schema.characters.id, characterId)).get()
  return Boolean(character && !character.deletedAt && dramaInWorkspace(c, character.dramaId))
}

export function sceneInWorkspace(c: Context, sceneId: number) {
  const scene = db.select().from(schema.scenes).where(eq(schema.scenes.id, sceneId)).get()
  return Boolean(scene && !scene.deletedAt && dramaInWorkspace(c, scene.dramaId))
}

function imageInWorkspace(c: Context, imageId: number) {
  const image = db.select().from(schema.imageGenerations).where(eq(schema.imageGenerations.id, imageId)).get()
  if (!image) return false
  if (image.dramaId) return dramaInWorkspace(c, image.dramaId)
  if (image.storyboardId) return storyboardInWorkspace(c, image.storyboardId)
  return false
}

function videoInWorkspace(c: Context, videoId: number) {
  const video = db.select().from(schema.videoGenerations).where(eq(schema.videoGenerations.id, videoId)).get()
  if (!video || video.deletedAt) return false
  if (video.dramaId) return dramaInWorkspace(c, video.dramaId)
  if (video.storyboardId) return storyboardInWorkspace(c, video.storyboardId)
  return false
}

function positive(value: unknown) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function isAdminOnlyPath(path: string, method: string) {
  if (path.startsWith('/api/v1/agent-configs')) return true
  if (path.startsWith('/api/v1/skills')) return method !== 'GET'
  // Authenticated production users need the read-only, secret-free config list
  // to create episodes and populate generation controls. Mutations and probes
  // remain platform-admin only.
  if (path.startsWith('/api/v1/ai-configs')) return method !== 'GET'
  if (path.startsWith('/api/v1/ai-providers')) return method !== 'GET'
  if (path.startsWith('/api/v1/ai-voices/sync')) return true
  if (/^\/api\/v1\/agent\/[^/]+\/debug$/.test(path)) return true
  return false
}

export const tenantGuardMiddleware: MiddlewareHandler = async (c, next) => {
  const path = c.req.path
  const method = c.req.method.toUpperCase()
  if (path === '/api/v1/health' || path === '/api/v1/auth/login' || path === '/api/v1/auth/session') return next()
  if (!getAuthOrNull(c)) {
    if (method !== 'GET') return forbidden(c)
    if (path === '/api/v1/dramas') return next()
    const dramaMatch = path.match(/^\/api\/v1\/dramas\/(\d+)$/)
    if (dramaMatch && publicDrama(Number(dramaMatch[1]))) return next()
    const episodeMatch = path.match(/^\/api\/v1\/episodes\/(\d+)\/(characters|scenes|storyboards)$/)
    if (episodeMatch && publicEpisode(Number(episodeMatch[1]))) return next()
    const mergeMatch = path.match(/^\/api\/v1\/merge\/episodes\/(\d+)\/merge$/)
    if (mergeMatch && publicEpisode(Number(mergeMatch[1]))) return next()
    return forbidden(c)
  }
  if (isAdminOnlyPath(path, method) && !isPlatformAdmin(c)) {
    return forbidden(c, 'Platform administrator access required')
  }

  const checks: Array<[RegExp, (ctx: Context, id: number) => boolean]> = [
    [/^\/api\/v1\/dramas\/(\d+)/, dramaInWorkspace],
    [/^\/api\/v1\/episodes\/(\d+)/, episodeInWorkspace],
    [/^\/api\/v1\/characters\/(\d+)/, characterInWorkspace],
    [/^\/api\/v1\/scenes\/(\d+)/, sceneInWorkspace],
    [/^\/api\/v1\/storyboards\/(\d+)/, storyboardInWorkspace],
    [/^\/api\/v1\/compose\/storyboards\/(\d+)/, storyboardInWorkspace],
    [/^\/api\/v1\/compose\/episodes\/(\d+)/, episodeInWorkspace],
    [/^\/api\/v1\/merge\/episodes\/(\d+)/, episodeInWorkspace],
    [/^\/api\/v1\/images\/(\d+)/, imageInWorkspace],
    [/^\/api\/v1\/videos\/(\d+)/, videoInWorkspace],
    [/^\/api\/v1\/grid\/status\/(\d+)/, imageInWorkspace],
  ]
  for (const [pattern, check] of checks) {
    const match = path.match(pattern)
    if (match && !check(c, Number(match[1]))) return forbidden(c)
  }

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const contentType = c.req.header('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await c.req.json().catch(() => ({})) as Record<string, unknown>
      const scalarChecks: Array<[string, (ctx: Context, id: number) => boolean]> = [
        ['drama_id', dramaInWorkspace],
        ['episode_id', episodeInWorkspace],
        ['storyboard_id', storyboardInWorkspace],
        ['character_id', characterInWorkspace],
        ['scene_id', sceneInWorkspace],
        ['image_generation_id', imageInWorkspace],
      ]
      for (const [key, check] of scalarChecks) {
        const id = positive(body[key])
        if (id && !check(c, id)) return forbidden(c)
      }
      const arrayChecks: Array<[string, (ctx: Context, id: number) => boolean]> = [
        ['storyboard_ids', storyboardInWorkspace],
        ['character_ids', characterInWorkspace],
      ]
      for (const [key, check] of arrayChecks) {
        const values = Array.isArray(body[key]) ? body[key] as unknown[] : []
        if (values.some(value => {
          const id = positive(value)
          return id ? !check(c, id) : true
        })) return forbidden(c)
      }
      const dramaId = positive(body.drama_id)
      const episodeId = positive(body.episode_id)
      if (dramaId && episodeId) {
        const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, episodeId)).get()
        if (!episode || episode.dramaId !== dramaId) return forbidden(c, 'Episode does not belong to project')
      }
      const assignments = Array.isArray(body.assignments) ? body.assignments as Array<Record<string, unknown>> : []
      if (assignments.some(item => {
        const storyboardId = positive(item.storyboard_id)
        return !storyboardId || !storyboardInWorkspace(c, storyboardId)
      })) return forbidden(c)

      if (dramaId) {
        const storyboardIds = Array.isArray(body.storyboard_ids) ? body.storyboard_ids as unknown[] : []
        for (const value of storyboardIds) {
          const storyboardId = positive(value)
          if (!storyboardId) return forbidden(c)
          const storyboard = db.select().from(schema.storyboards).where(eq(schema.storyboards.id, storyboardId)).get()
          const episode = storyboard
            ? db.select().from(schema.episodes).where(eq(schema.episodes.id, storyboard.episodeId)).get()
            : null
          if (!episode || episode.dramaId !== dramaId) return forbidden(c, 'Storyboard does not belong to project')
        }
      }

      const singleMediaFields = ['image_url', 'imageUrl', 'first_frame_url', 'firstFrameUrl', 'last_frame_url', 'lastFrameUrl']
      for (const key of singleMediaFields) {
        const value = body[key]
        if (normalizedStaticPath(value) && !staticMediaInWorkspace(c, value)) return forbidden(c)
      }
      const mediaArrayFields = ['reference_images', 'referenceImages', 'reference_image_urls', 'referenceImageUrls']
      for (const key of mediaArrayFields) {
        let values = Array.isArray(body[key]) ? body[key] as unknown[] : []
        if (!values.length && typeof body[key] === 'string') {
          try {
            const parsed = JSON.parse(body[key] as string)
            values = Array.isArray(parsed) ? parsed : []
          } catch {
            return forbidden(c)
          }
        }
        if (values.some(value => normalizedStaticPath(value) && !staticMediaInWorkspace(c, value))) {
          return forbidden(c)
        }
      }
    }
  }

  return next()
}

function normalizedStaticPath(value: unknown) {
  const raw = String(value || '').trim().replace(/^\//, '')
  return raw.startsWith('static/') ? raw : null
}

function includesMediaPath(rows: any[], fields: string[], requestedPath: string) {
  return rows.some(row => fields.some(field => normalizedStaticPath(row[field]) === requestedPath))
}

function includesMediaPathArray(rows: any[], fields: string[], requestedPath: string) {
  return rows.some(row => fields.some(field => {
    const raw = row[field]
    if (!raw) return false
    try {
      const parsed = Array.isArray(raw) ? raw : JSON.parse(String(raw))
      return Array.isArray(parsed) && parsed.some(value => normalizedStaticPath(value) === requestedPath)
    } catch {
      return false
    }
  }))
}

/**
 * Static media is private by default. The public flagship has a dedicated
 * prefix; every other object must be referenced by the active workspace or
 * registered as an upload owned by that workspace.
 */
export function staticMediaInWorkspace(c: Context, value: unknown) {
  const requestedPath = normalizedStaticPath(value)
  if (!requestedPath) return false
  if (requestedPath.startsWith('static/flagship-59s/')) return true
  const auth = getAuth(c)
  const upload = db.select().from(schema.mediaObjects).all().find(row => (
    row.workspaceId === auth.workspace.id && normalizedStaticPath(row.path) === requestedPath
  ))
  if (upload) return true

  const dramas = db.select().from(schema.dramas).all().filter(row => (
    row.workspaceId === auth.workspace.id && !row.deletedAt
  ))
  const dramaIds = new Set(dramas.map(row => row.id))
  if (!dramaIds.size) return false
  if (includesMediaPath(dramas, ['thumbnail'], requestedPath)) return true

  const episodes = db.select().from(schema.episodes).all().filter(row => dramaIds.has(row.dramaId) && !row.deletedAt)
  if (includesMediaPath(episodes, ['videoUrl', 'thumbnail'], requestedPath)) return true
  const episodeIds = new Set(episodes.map(row => row.id))

  const characters = db.select().from(schema.characters).all().filter(row => dramaIds.has(row.dramaId) && !row.deletedAt)
  if (includesMediaPath(characters, ['imageUrl', 'localPath', 'voiceSampleUrl'], requestedPath)) return true
  if (includesMediaPathArray(characters, ['referenceImages'], requestedPath)) return true
  const characterIds = new Set(characters.map(row => row.id))

  const scenes = db.select().from(schema.scenes).all().filter(row => dramaIds.has(row.dramaId) && !row.deletedAt)
  if (includesMediaPath(scenes, ['imageUrl', 'localPath'], requestedPath)) return true
  const sceneIds = new Set(scenes.map(row => row.id))

  const storyboards = db.select().from(schema.storyboards).all().filter(row => episodeIds.has(row.episodeId) && !row.deletedAt)
  if (includesMediaPath(storyboards, [
    'composedImage', 'firstFrameImage', 'lastFrameImage', 'videoUrl',
    'ttsAudioUrl', 'subtitleUrl', 'composedVideoUrl',
  ], requestedPath)) return true
  if (includesMediaPathArray(storyboards, ['referenceImages'], requestedPath)) return true
  const storyboardIds = new Set(storyboards.map(row => row.id))

  const imageGenerations = db.select().from(schema.imageGenerations).all().filter(row => (
    (row.dramaId != null && dramaIds.has(row.dramaId))
    || (row.storyboardId != null && storyboardIds.has(row.storyboardId))
    || (row.characterId != null && characterIds.has(row.characterId))
    || (row.sceneId != null && sceneIds.has(row.sceneId))
  ))
  if (includesMediaPath(imageGenerations, ['localPath', 'imageUrl', 'minioUrl'], requestedPath)) return true
  if (includesMediaPathArray(imageGenerations, ['referenceImages'], requestedPath)) return true

  const videoGenerations = db.select().from(schema.videoGenerations).all().filter(row => (
    !row.deletedAt && ((row.dramaId != null && dramaIds.has(row.dramaId))
      || (row.storyboardId != null && storyboardIds.has(row.storyboardId)))
  ))
  if (includesMediaPath(videoGenerations, ['localPath', 'videoUrl', 'minioUrl'], requestedPath)) return true
  if (includesMediaPathArray(videoGenerations, ['referenceImageUrls'], requestedPath)) return true

  const merges = db.select().from(schema.videoMerges).all().filter(row => (
    !row.deletedAt && row.dramaId != null && dramaIds.has(row.dramaId)
  ))
  if (includesMediaPath(merges, ['mergedUrl'], requestedPath)) return true

  const props = db.select().from(schema.props).all().filter(row => dramaIds.has(row.dramaId) && !row.deletedAt)
  if (includesMediaPath(props, ['imageUrl', 'localPath'], requestedPath)) return true
  if (includesMediaPathArray(props, ['referenceImages'], requestedPath)) return true

  const assets = db.select().from(schema.assets).all().filter(row => (
    !row.deletedAt && row.dramaId != null && dramaIds.has(row.dramaId)
  ))
  if (includesMediaPath(assets, ['url', 'thumbnailUrl', 'localPath'], requestedPath)) return true

  return false
}

export const staticMediaGuardMiddleware: MiddlewareHandler = async (c, next) => {
  if (!staticMediaInWorkspace(c, c.req.path)) return c.notFound()
  return next()
}
