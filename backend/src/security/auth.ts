import { createHash, randomBytes } from 'node:crypto'
import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { unauthorized } from '../utils/response.js'
import { resolveSecret } from '../services/secrets.js'

export const SESSION_COOKIE = 'lingdrama_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 12
export const REMEMBER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

export interface AuthContext {
  sessionId: number
  user: typeof schema.users.$inferSelect
  workspace: typeof schema.workspaces.$inferSelect
  membershipRole: string
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function requestIp(c: Context) {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || 'unknown'
}

export function hashIp(ip: string) {
  const pepper = resolveSecret(process.env.LINGDRAMA_IP_HASH_PEPPER) || 'lingdrama-local'
  return createHash('sha256').update(`${pepper}:${ip}`).digest('hex')
}

export function getAuth(c: Context): AuthContext {
  const auth = c.get('auth' as never) as AuthContext | undefined
  if (!auth) throw new Error('Authenticated context missing')
  return auth
}

export function getAuthOrNull(c: Context): AuthContext | null {
  return (c.get('auth' as never) as AuthContext | undefined) || null
}

export function isPlatformAdmin(c: Context) {
  return Boolean(getAuth(c).user.isPlatformAdmin)
}

function chooseWorkspace(user: typeof schema.users.$inferSelect, session: typeof schema.sessions.$inferSelect, c: Context) {
  const requested = Number(c.req.header('x-lingdrama-workspace-id') || session.activeWorkspaceId || 0)
  const memberships = db.select().from(schema.workspaceMemberships)
    .where(eq(schema.workspaceMemberships.userId, user.id)).all()
  const allowedIds = new Set(memberships.map(row => row.workspaceId))

  let workspaceId = requested
  if (!workspaceId || (!user.isPlatformAdmin && !allowedIds.has(workspaceId))) {
    workspaceId = memberships[0]?.workspaceId || 0
  }
  if (!workspaceId && user.isPlatformAdmin) {
    workspaceId = db.select().from(schema.workspaces).all()[0]?.id || 0
  }
  if (!workspaceId) return null

  const workspace = db.select().from(schema.workspaces)
    .where(and(eq(schema.workspaces.id, workspaceId), eq(schema.workspaces.status, 'active'))).get()
  if (!workspace) return null
  if (!user.isPlatformAdmin && !allowedIds.has(workspace.id)) return null

  return {
    workspace,
    membershipRole: user.isPlatformAdmin
      ? 'platform_admin'
      : memberships.find(row => row.workspaceId === workspace.id)?.role || 'member',
  }
}

const PUBLIC_API_PATHS = new Set([
  '/api/v1/health',
  '/api/v1/auth/login',
])

const OPTIONAL_AUTH_PATHS = new Set([
  '/api/v1/auth/session',
])

function isPublicRead(path: string, method: string) {
  if (method !== 'GET') return false
  return path === '/api/v1/dramas'
    || /^\/api\/v1\/dramas\/\d+$/.test(path)
    || /^\/api\/v1\/episodes\/\d+\/(characters|scenes|storyboards)$/.test(path)
    || /^\/api\/v1\/merge\/episodes\/\d+\/merge$/.test(path)
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const protectedStatic = c.req.path.startsWith('/static/')
    && !c.req.path.startsWith('/static/flagship-59s/')
  if ((!c.req.path.startsWith('/api/v1/') && !protectedStatic) || PUBLIC_API_PATHS.has(c.req.path)) return next()

  const optionalAuth = OPTIONAL_AUTH_PATHS.has(c.req.path)

  const token = getCookie(c, SESSION_COOKIE)
  if (!token) {
    if (protectedStatic) return c.notFound()
    return optionalAuth || isPublicRead(c.req.path, c.req.method) ? next() : unauthorized(c)
  }
  const now = new Date().toISOString()
  const session = db.select().from(schema.sessions).where(and(
    eq(schema.sessions.tokenHash, hashSessionToken(token)),
    isNull(schema.sessions.revokedAt),
    gt(schema.sessions.expiresAt, now),
  )).get()
  if (!session) {
    if (protectedStatic) return c.notFound()
    return optionalAuth || isPublicRead(c.req.path, c.req.method) ? next() : unauthorized(c)
  }

  const user = db.select().from(schema.users).where(and(
    eq(schema.users.id, session.userId),
    eq(schema.users.status, 'active'),
  )).get()
  if (!user) return unauthorized(c)

  const selected = chooseWorkspace(user, session, c)
  if (!selected) return unauthorized(c, 'No active workspace')

  const auth: AuthContext = {
    sessionId: session.id,
    user,
    workspace: selected.workspace,
    membershipRole: selected.membershipRole,
  }
  c.set('auth' as never, auth as never)

  // Avoid a database write on every request while still keeping active
  // sessions observable and revocable.
  if (Date.now() - new Date(session.lastSeenAt).getTime() > 5 * 60 * 1000) {
    db.update(schema.sessions).set({ lastSeenAt: now }).where(eq(schema.sessions.id, session.id)).run()
  }
  return next()
}
