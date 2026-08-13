import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lingdrama-auth-'))
process.env.NODE_ENV = 'test'
process.env.DB_PATH = path.join(tempDir, 'test.db')
process.env.STORAGE_PATH = path.join(tempDir, 'static')
process.env.LINGDRAMA_COOKIE_SECURE = 'false'

const [{ app }, { db, schema }, { hashPassword }, { resolveStoragePath }] = await Promise.all([
  import('../src/index.js'),
  import('../src/db/index.js'),
  import('../src/security/passwords.js'),
  import('../src/utils/storage.js'),
])

const now = new Date().toISOString()

function createTenant(slug: string, email: string, publicProject = false) {
  const organizationId = Number(db.insert(schema.organizations).values({
    name: `${slug} organization`, slug: `${slug}-org`, region: 'US', city: 'New York',
    locale: 'en-US', timezone: 'America/New_York', status: 'active', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const workspaceId = Number(db.insert(schema.workspaces).values({
    organizationId, name: `${slug} workspace`, slug: `${slug}-workspace`, region: 'US', city: 'New York',
    locale: 'en-US', timezone: 'America/New_York', status: 'active', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const userId = Number(db.insert(schema.users).values({
    email, passwordHash: hashPassword('SecurePass!2026'), displayName: slug, locale: 'en-US',
    status: 'active', isPlatformAdmin: false, createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  db.insert(schema.organizationMemberships).values({ organizationId, userId, role: 'owner', createdAt: now }).run()
  db.insert(schema.workspaceMemberships).values({ workspaceId, userId, role: 'owner', createdAt: now }).run()
  const dramaId = Number(db.insert(schema.dramas).values({
    workspaceId, createdBy: userId, isPublic: publicProject, title: `${slug} project`, status: 'draft',
    createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const episodeId = Number(db.insert(schema.episodes).values({
    dramaId, episodeNumber: 1, title: 'Episode 1', status: 'draft', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  return { organizationId, workspaceId, userId, dramaId, episodeId }
}

const alpha = createTenant('alpha', 'alpha@lingdrama.test', true)
const beta = createTenant('beta', 'beta@lingdrama.test')
const configId = Number(db.insert(schema.aiServiceConfigs).values({
  serviceType: 'image', provider: 'openai', name: 'Private provider',
  baseUrl: 'https://provider.example/v1?internal=1', apiKey: 'file:/private/key',
  model: JSON.stringify(['image-model']), endpoint: '/secret-endpoint',
  queryEndpoint: '/secret-query', settings: JSON.stringify({ token: 'private' }),
  priority: 10, isDefault: true, isActive: true, createdAt: now, updatedAt: now,
}).run().lastInsertRowid)
const publicCharacterId = Number(db.insert(schema.characters).values({
  dramaId: alpha.dramaId, name: 'Public lead', role: 'Lead', voiceStyle: 'internal voice profile',
  localPath: '/private/character.png', imageUrl: 'static/public/character.png', createdAt: now, updatedAt: now,
}).run().lastInsertRowid)
const publicSceneId = Number(db.insert(schema.scenes).values({
  dramaId: alpha.dramaId, episodeId: alpha.episodeId, location: 'Apartment', time: 'Night',
  prompt: 'internal scene prompt', localPath: '/private/scene.png', imageUrl: 'static/public/scene.png',
  createdAt: now, updatedAt: now,
}).run().lastInsertRowid)
const publicStoryboardId = Number(db.insert(schema.storyboards).values({
  episodeId: alpha.episodeId, sceneId: publicSceneId, storyboardNumber: 1, title: 'Door',
  imagePrompt: 'internal image prompt', videoPrompt: 'internal video prompt', referenceImages: '["internal"]',
  firstFrameImage: 'static/public/shot.jpg', videoUrl: 'static/public/shot.mp4', duration: 4,
  createdAt: now, updatedAt: now,
}).run().lastInsertRowid)
db.insert(schema.episodeCharacters).values({ episodeId: alpha.episodeId, characterId: publicCharacterId, createdAt: now }).run()
db.insert(schema.episodeScenes).values({ episodeId: alpha.episodeId, sceneId: publicSceneId, createdAt: now }).run()
db.insert(schema.storyboardCharacters).values({ storyboardId: publicStoryboardId, characterId: publicCharacterId }).run()
db.insert(schema.videoMerges).values({
  episodeId: alpha.episodeId, dramaId: alpha.dramaId, title: 'Master', provider: 'internal-provider',
  model: 'internal-model', status: 'completed', scenes: '["internal"]', mergedUrl: 'static/public/master.mp4',
  duration: 48, taskId: 'private-task-id', createdAt: now, completedAt: now,
}).run()
const adminId = Number(db.insert(schema.users).values({
  email: 'admin@lingdrama.test', passwordHash: hashPassword('SecurePass!2026'), displayName: 'Admin',
  locale: 'en-US', status: 'active', isPlatformAdmin: true, createdAt: now, updatedAt: now,
}).run().lastInsertRowid)
db.insert(schema.workspaceMemberships).values({ workspaceId: alpha.workspaceId, userId: adminId, role: 'owner', createdAt: now }).run()

for (const relative of [
  'static/flagship-59s/public.txt',
  'static/uploads/alpha-private.txt',
  'static/uploads/beta-private.txt',
]) {
  const absolute = path.join(tempDir, relative)
  fs.mkdirSync(path.dirname(absolute), { recursive: true })
  fs.writeFileSync(absolute, relative)
}
db.insert(schema.mediaObjects).values({
  workspaceId: alpha.workspaceId, userId: alpha.userId,
  path: 'static/uploads/alpha-private.txt', mimeType: 'text/plain', sizeBytes: 10, createdAt: now,
}).run()
db.insert(schema.mediaObjects).values({
  workspaceId: beta.workspaceId, userId: beta.userId,
  path: 'static/uploads/beta-private.txt', mimeType: 'text/plain', sizeBytes: 10, createdAt: now,
}).run()

async function login(email: string, remember = false) {
  const response = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'SecurePass!2026', remember }),
  })
  assert.equal(response.status, 200)
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie?.startsWith('lingdrama_session='))
  assert.match(response.headers.get('set-cookie') || '', /HttpOnly/i)
  return cookie!
}

test('remember controls persistent cookie lifetime', async () => {
  const regular = await app.request('/api/v1/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alpha@lingdrama.test', password: 'SecurePass!2026', remember: false }),
  })
  assert.doesNotMatch(regular.headers.get('set-cookie') || '', /Max-Age=/i)
  const remembered = await app.request('/api/v1/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'alpha@lingdrama.test', password: 'SecurePass!2026', remember: true }),
  })
  assert.match(remembered.headers.get('set-cookie') || '', /Max-Age=604800/i)
  const payload = await remembered.json() as any
  assert.equal(payload.data.session.remembered, true)
})

test('request body limits reject oversized login payloads before authentication', async () => {
  const response = await app.request('/api/v1/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account: 'alpha@lingdrama.test', password: 'x'.repeat(33 * 1024) }),
  })
  assert.equal(response.status, 413)
})

test('anonymous users see only explicitly public productions', async () => {
  const response = await app.request('/api/v1/dramas')
  assert.equal(response.status, 200)
  const payload = await response.json() as any
  assert.deepEqual(payload.data.items.map((row: any) => row.id), [alpha.dramaId])
  const publicItem = payload.data.items[0]
  assert.equal(publicItem.preview_video, 'static/public/master.mp4')
  assert.equal(publicItem.episodes[0].script_ready, false)
  for (const key of ['workspace_id', 'created_by', 'metadata', 'deleted_at']) assert.equal(key in publicItem, false)
  for (const key of ['content', 'script_content', 'image_config_id', 'video_config_id', 'audio_config_id', 'drama_id']) {
    assert.equal(key in publicItem.episodes[0], false)
  }

  const detail = await (await app.request(`/api/v1/dramas/${alpha.dramaId}`)).json() as any
  assert.equal(detail.data.storyboards[0].first_frame_image, 'static/public/shot.jpg')
  assert.equal(detail.data.characters[0].image_url, 'static/public/character.png')
  assert.equal(detail.data.scenes[0].image_url, 'static/public/scene.png')
  for (const key of ['image_prompt', 'video_prompt', 'bgm_prompt', 'reference_images']) {
    assert.equal(key in detail.data.storyboards[0], false)
  }
  assert.equal('local_path' in detail.data.characters[0], false)
  assert.equal('voice_style' in detail.data.characters[0], false)
  assert.equal('prompt' in detail.data.scenes[0], false)
  assert.equal('local_path' in detail.data.scenes[0], false)

  const storyboards = await (await app.request(`/api/v1/episodes/${alpha.episodeId}/storyboards`)).json() as any
  assert.equal(storyboards.data[0].video_url, 'static/public/shot.mp4')
  assert.equal('video_prompt' in storyboards.data[0], false)
  assert.equal('voice_style' in storyboards.data[0].characters[0], false)
  const merge = await (await app.request(`/api/v1/merge/episodes/${alpha.episodeId}/merge`)).json() as any
  assert.deepEqual(Object.keys(merge.data).sort(), ['completed_at', 'duration', 'merged_url', 'status'])
  assert.equal(merge.data.merged_url, 'static/public/master.mp4')
  assert.equal((await app.request(`/api/v1/dramas/${beta.dramaId}`)).status, 404)
})

test('server session authenticates me and logout revokes it', async () => {
  const signedOutSession = await app.request('/api/v1/auth/session')
  assert.equal(signedOutSession.status, 200)
  assert.equal(((await signedOutSession.json()) as any).data.authenticated, false)

  const cookie = await login('alpha@lingdrama.test')
  const signedInSession = await app.request('/api/v1/auth/session', { headers: { cookie } })
  assert.equal(signedInSession.status, 200)
  assert.equal(((await signedInSession.json()) as any).data.user.email, 'alpha@lingdrama.test')
  const me = await app.request('/api/v1/auth/me', { headers: { cookie } })
  assert.equal(me.status, 200)
  const payload = await me.json() as any
  assert.equal(payload.data.user.email, 'alpha@lingdrama.test')
  assert.equal(payload.data.workspace.id, alpha.workspaceId)

  const logout = await app.request('/api/v1/auth/logout', { method: 'POST', headers: { cookie } })
  assert.equal(logout.status, 200)
  assert.equal((await app.request('/api/v1/auth/me', { headers: { cookie } })).status, 401)
})

test('tenant project lists and direct ids are isolated', async () => {
  const cookie = await login('alpha@lingdrama.test')
  const list = await app.request('/api/v1/dramas', { headers: { cookie } })
  const payload = await list.json() as any
  assert.deepEqual(payload.data.items.map((row: any) => row.id), [alpha.dramaId])
  assert.equal((await app.request(`/api/v1/dramas/${beta.dramaId}`, { headers: { cookie } })).status, 404)
  assert.equal((await app.request(`/api/v1/episodes/${beta.episodeId}/storyboards`, { headers: { cookie } })).status, 404)
  assert.equal((await app.request(`/api/v1/images?drama_id=${beta.dramaId}`, { headers: { cookie } })).status, 200)
  const images = await (await app.request(`/api/v1/images?drama_id=${beta.dramaId}`, { headers: { cookie } })).json() as any
  assert.deepEqual(images.data, [])
})

test('generation responses never expose upstream or signed media URLs', async () => {
  const imageId = Number(db.insert(schema.imageGenerations).values({
    dramaId: alpha.dramaId, provider: 'private-provider', prompt: 'private prompt',
    imageUrl: 'https://upstream.example/image?token=secret',
    minioUrl: 'https://storage.example/image?signature=secret',
    localPath: 'static/flagship-59s/public.txt', status: 'completed', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const videoId = Number(db.insert(schema.videoGenerations).values({
    dramaId: alpha.dramaId, provider: 'private-provider', prompt: 'private prompt',
    imageUrl: 'https://upstream.example/reference?token=secret',
    videoUrl: 'https://upstream.example/video?token=secret',
    minioUrl: 'https://storage.example/video?signature=secret', taskId: 'private-task',
    localPath: 'static/flagship-59s/public.txt', status: 'completed', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const cookie = await login('alpha@lingdrama.test')
  const image = (await (await app.request(`/api/v1/images/${imageId}`, { headers: { cookie } })).json() as any).data
  const video = (await (await app.request(`/api/v1/videos/${videoId}`, { headers: { cookie } })).json() as any).data
  for (const row of [image, video]) {
    assert.equal('minioUrl' in row, false)
    assert.equal('providerUrl' in row, false)
    assert.equal('taskId' in row, false)
    assert.doesNotMatch(JSON.stringify(row), /token=secret|signature=secret|private-task/)
  }
  assert.equal(video.videoUrl, '/static/flagship-59s/public.txt')
})

test('AI service configuration reads are secret-free and mutations are platform-admin only', async () => {
  const cookie = await login('alpha@lingdrama.test')
  const list = await app.request('/api/v1/ai-configs', { headers: { cookie } })
  assert.equal(list.status, 200)
  const listPayload = await list.json() as any
  for (const config of listPayload.data) {
    assert.deepEqual(Object.keys(config).sort(), [
      'has_api_key', 'id', 'is_active', 'is_default', 'model', 'name',
      'priority', 'provider', 'service_type',
    ])
    assert.equal(typeof config.has_api_key, 'boolean')
  }
  const firstId = listPayload.data[0]?.id
  assert.equal(firstId, configId)
  if (firstId) {
    const detail = await app.request(`/api/v1/ai-configs/${firstId}`, { headers: { cookie } })
    assert.equal(detail.status, 200)
    const detailPayload = await detail.json() as any
    assert.equal('api_key' in detailPayload.data, false)
    assert.equal('apiKey' in detailPayload.data, false)
    assert.equal('base_url' in detailPayload.data, false)
    assert.equal('settings' in detailPayload.data, false)
    assert.equal('endpoint' in detailPayload.data, false)
    assert.equal('query_endpoint' in detailPayload.data, false)
  }
  assert.equal((await app.request('/api/v1/ai-configs/test', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}',
  })).status, 404)
  assert.equal((await app.request('/api/v1/ai-configs', {
    method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}',
  })).status, 404)

  const adminCookie = await login('admin@lingdrama.test')
  const adminList = await (await app.request('/api/v1/ai-configs', { headers: { cookie: adminCookie } })).json() as any
  assert.equal('base_url' in adminList.data[0], false)
  assert.equal(adminList.data[0].provider, 'openai')
  assert.match(adminList.data[0].name, /^LingDrama (Intelligence|Visual|Motion|Voice)$/)
  for (const key of ['api_key', 'settings', 'endpoint', 'query_endpoint', 'base_url']) {
    assert.equal(key in adminList.data[0], false)
  }
})

test('bulk updates reject ids outside the project', async () => {
  const foreignCharacterId = Number(db.insert(schema.characters).values({
    dramaId: beta.dramaId, name: 'Foreign', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const cookie = await login('alpha@lingdrama.test')
  const response = await app.request(`/api/v1/dramas/${alpha.dramaId}/characters`, {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ characters: [{ id: foreignCharacterId, name: 'Tampered' }] }),
  })
  assert.equal(response.status, 400)
  assert.equal(db.select().from(schema.characters).where(eq(schema.characters.id, foreignCharacterId)).get()?.name, 'Foreign')
})

test('bulk updates cannot rewrite record ownership or immutable fields', async () => {
  const ownCharacterId = Number(db.insert(schema.characters).values({
    dramaId: alpha.dramaId, name: 'Own', createdAt: now, updatedAt: now,
  }).run().lastInsertRowid)
  const cookie = await login('alpha@lingdrama.test')
  const characterResponse = await app.request(`/api/v1/dramas/${alpha.dramaId}/characters`, {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ characters: [{ id: ownCharacterId, name: 'Moved', dramaId: beta.dramaId }] }),
  })
  assert.equal(characterResponse.status, 400)
  const character = db.select().from(schema.characters).where(eq(schema.characters.id, ownCharacterId)).get()!
  assert.equal(character.dramaId, alpha.dramaId)
  assert.equal(character.name, 'Own')

  const mediaClaimResponse = await app.request(`/api/v1/dramas/${alpha.dramaId}/characters`, {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ characters: [{ id: ownCharacterId, image_url: 'static/uploads/beta-private.txt' }] }),
  })
  assert.equal(mediaClaimResponse.status, 400)
  assert.equal(db.select().from(schema.characters).where(eq(schema.characters.id, ownCharacterId)).get()?.imageUrl, null)

  const episodeResponse = await app.request(`/api/v1/dramas/${alpha.dramaId}/episodes`, {
    method: 'PUT', headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ episodes: [{ id: alpha.episodeId, title: 'Moved', drama_id: beta.dramaId }] }),
  })
  assert.equal(episodeResponse.status, 400)
  const episode = db.select().from(schema.episodes).where(eq(schema.episodes.id, alpha.episodeId)).get()!
  assert.equal(episode.dramaId, alpha.dramaId)
  assert.equal(episode.title, 'Episode 1')
})

test('static media is public only for the flagship and otherwise workspace-isolated', async () => {
  assert.equal((await app.request('/static/flagship-59s/public.txt')).status, 200)
  assert.equal((await app.request('/static/uploads/alpha-private.txt')).status, 404)
  const alphaCookie = await login('alpha@lingdrama.test')
  assert.equal((await app.request('/static/uploads/alpha-private.txt', { headers: { cookie: alphaCookie } })).status, 200)
  assert.equal((await app.request('/static/uploads/beta-private.txt', { headers: { cookie: alphaCookie } })).status, 404)
  const gridCellPath = 'static/grid-cells/alpha-reference.txt'
  const gridCellAbsolute = path.join(tempDir, gridCellPath)
  fs.mkdirSync(path.dirname(gridCellAbsolute), { recursive: true })
  fs.writeFileSync(gridCellAbsolute, 'grid reference')
  db.update(schema.storyboards).set({ referenceImages: JSON.stringify([gridCellPath]) })
    .where(eq(schema.storyboards.id, publicStoryboardId)).run()
  assert.equal((await app.request(`/${gridCellPath}`, { headers: { cookie: alphaCookie } })).status, 200)
  const betaCookie = await login('beta@lingdrama.test')
  assert.equal((await app.request(`/${gridCellPath}`, { headers: { cookie: betaCookie } })).status, 404)
  assert.equal((await app.request('/api/v1/videos', {
    method: 'POST', headers: { cookie: alphaCookie, 'content-type': 'application/json' },
    body: JSON.stringify({
      drama_id: alpha.dramaId,
      prompt: 'must not reach generation',
      image_url: 'static/uploads/beta-private.txt',
    }),
  })).status, 404)
})

test('image uploads validate bytes and register workspace ownership', async () => {
  const cookie = await login('alpha@lingdrama.test')
  const invalid = new FormData()
  invalid.set('file', new File([Buffer.from('not-an-image')], 'fake.png', { type: 'image/png' }))
  assert.equal((await app.request('/api/v1/upload/image', {
    method: 'POST', headers: { cookie }, body: invalid,
  })).status, 400)

  const png = await sharp({
    create: { width: 4, height: 4, channels: 3, background: '#123456' },
  }).png().toBuffer()
  const valid = new FormData()
  valid.set('file', new File([png], '../../unsafe-name.png', { type: 'image/png' }))
  const response = await app.request('/api/v1/upload/image', {
    method: 'POST', headers: { cookie }, body: valid,
  })
  assert.equal(response.status, 200)
  const payload = await response.json() as any
  assert.match(payload.data.path, /^static\/uploads\/[0-9a-f-]+\.png$/)
  assert.equal((await app.request(`/${payload.data.path}`)).status, 404)
  assert.equal((await app.request(`/${payload.data.path}`, { headers: { cookie } })).status, 200)
})

test('storage paths reject traversal, absolute paths and symlink escapes', () => {
  const safe = path.join(process.env.STORAGE_PATH!, 'safe.png')
  fs.writeFileSync(safe, 'safe')
  assert.equal(resolveStoragePath('static/safe.png', { mustExist: true }), fs.realpathSync(safe))
  assert.throws(() => resolveStoragePath('static/../../outside.png'), /Invalid storage path|escapes/)
  assert.throws(() => resolveStoragePath('../outside.png'), /Invalid storage path|escapes/)
  assert.throws(() => resolveStoragePath('/etc/passwd'), /Invalid storage path/)
  const outside = path.join(tempDir, 'outside.txt')
  fs.writeFileSync(outside, 'outside')
  const link = path.join(process.env.STORAGE_PATH!, 'escape-link')
  fs.symlinkSync(outside, link)
  assert.throws(() => resolveStoragePath('escape-link', { mustExist: true }), /escapes/)
})

test('usage aggregation cannot cross workspaces', async () => {
  db.insert(schema.aiActivityLogs).values({
    workspaceId: alpha.workspaceId, userId: alpha.userId, dramaId: alpha.dramaId, episodeId: alpha.episodeId,
    agentType: 'script_rewriter', provider: 'openai', model: 'deepseek-v4-pro', status: 'completed',
    inputTokens: 100, outputTokens: 50, totalTokens: 150, latencyMs: 800, createdAt: now, completedAt: now,
  }).run()
  db.insert(schema.aiActivityLogs).values({
    workspaceId: beta.workspaceId, userId: beta.userId, dramaId: beta.dramaId, episodeId: beta.episodeId,
    agentType: 'script_rewriter', provider: 'openai', model: 'deepseek-v4-pro', status: 'completed',
    inputTokens: 900, outputTokens: 500, totalTokens: 1400, latencyMs: 900, createdAt: now, completedAt: now,
  }).run()
  const cookie = await login('alpha@lingdrama.test')
  const response = await app.request('/api/v1/usage/summary', { headers: { cookie } })
  const payload = await response.json() as any
  assert.equal(payload.data.total_requests, 1)
  assert.equal(payload.data.total_tokens, 150)
})

test('platform admin can switch workspaces and ordinary users cannot', async () => {
  const adminCookie = await login('admin@lingdrama.test')
  const workspacesResponse = await app.request('/api/v1/workspaces', { headers: { cookie: adminCookie } })
  const workspacesPayload = await workspacesResponse.json() as any
  assert.equal(workspacesPayload.data.length, 2)

  const switched = await app.request('/api/v1/auth/switch-workspace', {
    method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: beta.workspaceId }),
  })
  assert.equal(switched.status, 200)
  const me = await (await app.request('/api/v1/auth/me', { headers: { cookie: adminCookie } })).json() as any
  assert.equal(me.data.workspace.id, beta.workspaceId)
  const projects = await (await app.request('/api/v1/dramas', { headers: { cookie: adminCookie } })).json() as any
  assert.deepEqual(projects.data.items.map((row: any) => row.id), [beta.dramaId])

  const alphaCookie = await login('alpha@lingdrama.test')
  const ownWorkspaces = await (await app.request('/api/v1/workspaces', { headers: { cookie: alphaCookie } })).json() as any
  assert.equal(ownWorkspaces.data.length, 1)
  assert.equal((await app.request('/api/v1/auth/switch-workspace', {
    method: 'POST', headers: { cookie: alphaCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ workspace_id: beta.workspaceId }),
  })).status, 401)
})

test.after(() => fs.rmSync(tempDir, { recursive: true, force: true }))
