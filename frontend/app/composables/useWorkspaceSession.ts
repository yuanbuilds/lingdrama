import { computed } from 'vue'
import { authAPI } from '~/composables/useApi'

export interface LingDramaUser {
  id: string | number
  account: string
  name: string
  role: string
  region: string
  avatar?: string
  isPlatformAdmin?: boolean
}

export interface LingDramaWorkspace {
  id: string | number
  name: string
  region: string
  role?: string
}

export interface LingDramaWorkspaceSession {
  user: LingDramaUser
  workspace: LingDramaWorkspace | null
  signedInAt: string
}

type SignInResult = { ok: true } | { ok: false; message: string }

let restorePromise: Promise<LingDramaWorkspaceSession | null> | null = null

function firstValue(source: any, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

function unwrapList(value: any): any[] {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.workspaces)) return value.workspaces
  return []
}

function normalizeWorkspace(value: any): LingDramaWorkspace | null {
  if (!value || typeof value !== 'object') return null
  const id = firstValue(value, ['id', 'workspace_id', 'workspaceId', 'slug'])
  const name = firstValue(value, ['name', 'workspace_name', 'workspaceName', 'title'])
  if (!id && !name) return null
  return {
    id: id || name,
    name: String(name || id),
    region: String(firstValue(value, ['region', 'region_name', 'regionName', 'locale'], 'Global')),
    role: String(firstValue(value, ['role', 'member_role', 'memberRole'])),
  }
}

function normalizeUser(value: any): LingDramaUser | null {
  const source = value?.user || value?.profile || value
  if (!source || typeof source !== 'object') return null
  const id = firstValue(source, ['id', 'user_id', 'userId', 'sub'])
  const account = firstValue(source, ['email', 'account', 'username'])
  if (!id || !account) return null
  const isPlatformAdmin = Boolean(firstValue(source, ['is_platform_admin', 'isPlatformAdmin'], false))
  return {
    id,
    account: String(account),
    name: String(firstValue(source, ['display_name', 'displayName', 'full_name', 'fullName', 'name'], account)),
    role: isPlatformAdmin ? 'platform_admin' : String(firstValue(source, ['title', 'role_name', 'roleName', 'role'], 'Producer')),
    region: String(firstValue(source, ['region_name', 'regionName', 'region', 'country', 'city', 'locale'], 'Global')),
    avatar: String(firstValue(source, ['avatar_url', 'avatarUrl', 'avatar'])) || undefined,
    isPlatformAdmin,
  }
}

function errorMessage(error: any) {
  return String(error?.message || 'Unable to sign in. Please try again.')
}

export function safeWorkspaceRedirect(value: unknown, fallback = '/') {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  if (!/^\/(?!\/)/.test(target) || target.includes('\\') || target.startsWith('/login')) return fallback
  return target
}

export function useWorkspaceSession() {
  const session = useState<LingDramaWorkspaceSession | null>('lingdrama-workspace-session', () => null)
  const workspaces = useState<LingDramaWorkspace[]>('lingdrama-workspaces', () => [])
  const usage = useState<any | null>('lingdrama-workspace-usage', () => null)
  const ready = useState<boolean>('lingdrama-workspace-session-ready', () => false)
  const sessionError = useState<string>('lingdrama-workspace-session-error', () => '')

  const isAuthenticated = computed(() => Boolean(session.value?.user))
  const currentUser = computed(() => session.value?.user || null)
  const currentWorkspace = computed(() => session.value?.workspace || workspaces.value[0] || null)
  const canManageSettings = computed(() => Boolean(currentUser.value?.isPlatformAdmin)
    || ['admin', 'administrator', 'owner', 'platform_admin'].includes(String(currentUser.value?.role || '').toLowerCase()))

  function clear() {
    session.value = null
    workspaces.value = []
    usage.value = null
  }

  async function hydrate(meResult?: any) {
    let me = meResult ?? await authAPI.session()
    let user = normalizeUser(me)
    if (!user && meResult !== undefined) {
      me = await authAPI.me()
      user = normalizeUser(me)
    }
    if (!user) throw new Error('The account profile could not be loaded.')

    const embeddedWorkspace = normalizeWorkspace(me?.workspace || me?.current_workspace || me?.currentWorkspace || me?.user?.workspace)
    session.value = {
      user,
      workspace: embeddedWorkspace,
      signedInAt: String(firstValue(me, ['signed_in_at', 'signedInAt'], new Date().toISOString())),
    }

    const [workspaceResult, usageResult] = await Promise.allSettled([authAPI.workspaces(), authAPI.usage()])
    if (workspaceResult.status === 'fulfilled') {
      workspaces.value = unwrapList(workspaceResult.value).map(normalizeWorkspace).filter(Boolean) as LingDramaWorkspace[]
      if (!session.value.workspace && workspaces.value.length) session.value.workspace = workspaces.value[0]
    }
    if (usageResult.status === 'fulfilled') usage.value = usageResult.value
    return session.value
  }

  async function restore(force = false) {
    if (!import.meta.client) return session.value
    if (ready.value && !force) return session.value
    if (restorePromise && !force) return restorePromise

    restorePromise = (async () => {
      sessionError.value = ''
      try {
        return await hydrate()
      } catch (error: any) {
        clear()
        if (!/401|403|unauth|not authenticated|未登录/i.test(errorMessage(error))) {
          sessionError.value = errorMessage(error)
        }
        return null
      } finally {
        ready.value = true
        restorePromise = null
      }
    })()
    return restorePromise
  }

  async function signIn(account: string, password: string, remember = true): Promise<SignInResult> {
    sessionError.value = ''
    try {
      const result = await authAPI.login({ account: String(account || '').trim(), password, remember })
      await hydrate(result)
      ready.value = true
      return { ok: true }
    } catch (error: any) {
      clear()
      ready.value = true
      sessionError.value = errorMessage(error)
      return { ok: false, message: sessionError.value }
    }
  }

  async function signOut() {
    try {
      await authAPI.logout()
    } finally {
      clear()
      ready.value = true
      sessionError.value = ''
    }
  }

  async function switchWorkspace(workspaceId: string | number) {
    await authAPI.switchWorkspace(workspaceId)
    ready.value = false
    await restore(true)
  }

  return {
    session,
    workspaces,
    usage,
    ready,
    sessionError,
    isAuthenticated,
    currentUser,
    currentWorkspace,
    canManageSettings,
    restore,
    signIn,
    signOut,
    switchWorkspace,
  }
}
