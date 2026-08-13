import { Hono } from 'hono'
import { deleteCookie, setCookie } from 'hono/cookie'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, success, unauthorized } from '../utils/response.js'
import {
  getAuth,
  getAuthOrNull,
  hashIp,
  hashSessionToken,
  newSessionToken,
  requestIp,
  REMEMBER_SESSION_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from '../security/auth.js'
import { verifyPassword } from '../security/passwords.js'
import { toSnakeCase } from '../utils/transform.js'

const app = new Hono()
const attempts = new Map<string, { failures: number; blockedUntil: number }>()
const MAX_FAILURES = 8
const BLOCK_MS = 15 * 60 * 1000

function publicUser(user: typeof schema.users.$inferSelect) {
  const { passwordHash: _passwordHash, ...safe } = user
  return toSnakeCase(safe)
}

function workspacePayload(workspace: typeof schema.workspaces.$inferSelect, role: string) {
  const organization = db.select().from(schema.organizations)
    .where(eq(schema.organizations.id, workspace.organizationId)).get()
  return {
    ...toSnakeCase(workspace),
    role,
    organization: organization ? toSnakeCase(organization) : null,
  }
}

function workspacesForUser(user: typeof schema.users.$inferSelect) {
  const memberships = db.select().from(schema.workspaceMemberships)
    .where(eq(schema.workspaceMemberships.userId, user.id)).all()
  const all = db.select().from(schema.workspaces).all().filter(row => row.status === 'active')
  if (user.isPlatformAdmin) {
    return all.map(workspace => workspacePayload(workspace, 'platform_admin'))
  }
  return memberships.map(membership => {
    const workspace = all.find(row => row.id === membership.workspaceId)
    return workspace ? workspacePayload(workspace, membership.role) : null
  }).filter(Boolean)
}

function cookieSecure(c: Parameters<typeof setCookie>[0]) {
  if (process.env.LINGDRAMA_COOKIE_SECURE === 'true') return true
  if (process.env.LINGDRAMA_COOKIE_SECURE === 'false') return false
  return c.req.header('x-forwarded-proto') === 'https'
}

app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const email = String(body.email || body.account || '').trim().toLowerCase()
  const password = String(body.password || '')
  const remember = body.remember === true
  if (!email || !password) return badRequest(c, 'Email and password are required')

  const attemptKey = hashIp(`${requestIp(c)}:${email}`)
  const attempt = attempts.get(attemptKey)
  if (attempt && attempt.blockedUntil > Date.now()) {
    return c.json({ code: 429, message: 'Too many login attempts. Try again later.' }, 429)
  }

  const user = db.select().from(schema.users).where(and(
    eq(schema.users.email, email),
    eq(schema.users.status, 'active'),
  )).get()
  const valid = user ? verifyPassword(password, user.passwordHash) : false
  if (!user || !valid) {
    const failures = (attempt?.failures || 0) + 1
    attempts.set(attemptKey, {
      failures,
      blockedUntil: failures >= MAX_FAILURES ? Date.now() + BLOCK_MS : 0,
    })
    return unauthorized(c, 'Invalid email or password')
  }
  attempts.delete(attemptKey)

  const workspaces = workspacesForUser(user) as Array<Record<string, any>>
  const workspace = workspaces[0]
  if (!workspace) return unauthorized(c, 'No active workspace')

  const token = newSessionToken()
  const now = new Date()
  const ttlSeconds = remember ? REMEMBER_SESSION_TTL_SECONDS : SESSION_TTL_SECONDS
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)
  const res = db.insert(schema.sessions).values({
    userId: user.id,
    tokenHash: hashSessionToken(token),
    activeWorkspaceId: workspace.id,
    userAgent: String(c.req.header('user-agent') || '').slice(0, 500),
    ipHash: hashIp(requestIp(c)),
    createdAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  }).run()
  db.update(schema.users).set({ lastLoginAt: now.toISOString(), updatedAt: now.toISOString() })
    .where(eq(schema.users.id, user.id)).run()

  setCookie(c, SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: cookieSecure(c),
    ...(remember ? { maxAge: ttlSeconds } : {}),
  })

  return success(c, {
    user: publicUser({ ...user, lastLoginAt: now.toISOString() }),
    workspace,
    workspaces,
    session: { id: Number(res.lastInsertRowid), expires_at: expiresAt.toISOString(), remembered: remember },
  })
})

app.post('/logout', async (c) => {
  const auth = getAuth(c)
  db.update(schema.sessions).set({ revokedAt: new Date().toISOString() })
    .where(eq(schema.sessions.id, auth.sessionId)).run()
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: cookieSecure(c) })
  return success(c, { logged_out: true })
})

app.get('/me', async (c) => {
  const auth = getAuth(c)
  return success(c, {
    user: publicUser(auth.user),
    workspace: workspacePayload(auth.workspace, auth.membershipRole),
    workspaces: workspacesForUser(auth.user),
  })
})

// Public, cache-safe session probe for the SPA. Unlike /me it returns 200 for
// signed-out visitors, avoiding a noisy 401 in the browser console while
// preserving strict /me semantics for authenticated API clients.
app.get('/session', async (c) => {
  c.header('Cache-Control', 'no-store')
  const auth = getAuthOrNull(c)
  if (!auth) return success(c, { authenticated: false })
  return success(c, {
    authenticated: true,
    user: publicUser(auth.user),
    workspace: workspacePayload(auth.workspace, auth.membershipRole),
    workspaces: workspacesForUser(auth.user),
  })
})

app.post('/switch-workspace', async (c) => {
  const auth = getAuth(c)
  const body = await c.req.json().catch(() => ({}))
  const workspaceId = Number(body.workspace_id)
  if (!workspaceId) return badRequest(c, 'workspace_id is required')
  const membership = db.select().from(schema.workspaceMemberships).where(and(
    eq(schema.workspaceMemberships.userId, auth.user.id),
    eq(schema.workspaceMemberships.workspaceId, workspaceId),
  )).get()
  if (!auth.user.isPlatformAdmin && !membership) return unauthorized(c, 'Workspace access denied')
  const workspace = db.select().from(schema.workspaces).where(eq(schema.workspaces.id, workspaceId)).get()
  if (!workspace || workspace.status !== 'active') return badRequest(c, 'Workspace not found')
  db.update(schema.sessions).set({ activeWorkspaceId: workspaceId })
    .where(eq(schema.sessions.id, auth.sessionId)).run()
  return success(c, workspacePayload(workspace, auth.user.isPlatformAdmin ? 'platform_admin' : membership!.role))
})

export default app
