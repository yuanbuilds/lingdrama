import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { bodyLimit } from 'hono/body-limit'
import path from 'path'
import { fileURLToPath } from 'url'

import dramas from './routes/dramas.js'
import episodes from './routes/episodes.js'
import storyboards from './routes/storyboards.js'
import scenes from './routes/scenes.js'
import characters from './routes/characters.js'
import images from './routes/images.js'
import videos from './routes/videos.js'
import upload from './routes/upload.js'
import aiConfigs, { aiProviders } from './routes/aiConfigs.js'
import agentConfigs from './routes/agentConfigs.js'
import agent from './routes/agent.js'
import compose from './routes/compose.js'
import merge from './routes/merge.js'
import grid from './routes/grid.js'
import skills from './routes/skills.js'
import webhooks from './routes/webhooks.js'
import aiVoices from './routes/aiVoices.js'
import auth from './routes/auth.js'
import workspaces from './routes/workspaces.js'
import usage from './routes/usage.js'
import { requestLogger, errorHandler } from './middleware/logger.js'
import { authMiddleware } from './security/auth.js'
import { staticMediaGuardMiddleware, tenantGuardMiddleware } from './security/tenant.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

const app = new Hono()
export { app }

// Middleware
app.use('*', cors({
  origin: ['http://localhost:3013', 'http://localhost:5679'],
  credentials: true,
}))
const apiBodyLimit = bodyLimit({
  maxSize: 2 * 1024 * 1024,
  onError: c => c.json({ code: 413, message: 'request body too large' }, 413),
})
const loginBodyLimit = bodyLimit({
  maxSize: 32 * 1024,
  onError: c => c.json({ code: 413, message: 'login request too large' }, 413),
})
const uploadBodyLimit = bodyLimit({
  maxSize: 20 * 1024 * 1024,
  onError: c => c.json({ code: 413, message: 'upload too large' }, 413),
})
app.use('/api/v1/*', (c, next) => {
  if (c.req.path === '/api/v1/auth/login') return loginBodyLimit(c, next)
  if (c.req.path === '/api/v1/upload/image') return uploadBodyLimit(c, next)
  return apiBodyLimit(c, next)
})
app.use('*', requestLogger)
app.use('*', errorHandler)

// Health check
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.use('/api/v1/*', authMiddleware)
app.use('/api/v1/*', tenantGuardMiddleware)

// API routes
const api = new Hono()
api.route('/auth', auth)
api.route('/workspaces', workspaces)
api.route('/usage', usage)
api.route('/dramas', dramas)
api.route('/episodes', episodes)
api.route('/storyboards', storyboards)
api.route('/scenes', scenes)
api.route('/characters', characters)
api.route('/images', images)
api.route('/videos', videos)
api.route('/upload', upload)
api.route('/ai-configs', aiConfigs)
api.route('/ai-providers', aiProviders)
api.route('/agent-configs', agentConfigs)
api.route('/agent', agent)
api.route('/compose', compose)
api.route('/merge', merge)
api.route('/grid', grid)
api.route('/skills', skills)
api.route('/ai-voices', aiVoices)

app.route('/api/v1', api)

// Webhook callbacks (Vidu, etc.) - outside /api/v1
app.route('/webhooks', webhooks)

// Serve static files (storage)
app.use('/static/*', authMiddleware)
app.use('/static/*', staticMediaGuardMiddleware)
const storageRoot = process.env.STORAGE_PATH || path.join(projectRoot, 'data', 'static')
app.use('/static/*', serveStatic({ root: path.dirname(storageRoot) }))

// Serve frontend (production build)
const distPath = path.join(projectRoot, 'frontend', 'dist')
app.use('*', serveStatic({ root: distPath }))
app.get('*', serveStatic({ root: distPath, path: 'index.html' }))

const port = Number(process.env.PORT || 5679)
if (process.env.NODE_ENV !== 'test') {
  console.log(`🚀 LingDrama server on http://localhost:${port}`)
  serve({ fetch: app.fetch, port })
}
