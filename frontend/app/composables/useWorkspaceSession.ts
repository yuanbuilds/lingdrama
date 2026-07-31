import { computed } from 'vue'

export const WORKSPACE_ACCOUNT = 'studio@lingdrama.ai'
export const WORKSPACE_PASSWORD = 'LingDrama2026'

const LOCAL_SESSION_KEY = 'lingdrama.workspace.session'
const TAB_SESSION_KEY = 'lingdrama.workspace.tab-session'

export interface LingDramaWorkspaceSession {
  version: 1
  account: string
  userId: string
  signedInAt: string
}

function isValidSession(value: unknown): value is LingDramaWorkspaceSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<LingDramaWorkspaceSession>
  return session.version === 1
    && session.account === WORKSPACE_ACCOUNT
    && session.userId === 'lingdrama-studio-admin'
    && typeof session.signedInAt === 'string'
}

function readSession(storage: Storage, key: string) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const value = JSON.parse(raw)
    return isValidSession(value) ? value : null
  } catch {
    return null
  }
}

export function safeWorkspaceRedirect(value: unknown, fallback = '/') {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  if (!/^\/(?!\/)/.test(target) || target.includes('\\') || target.startsWith('/login')) return fallback
  return target
}

export function useWorkspaceSession() {
  const session = useState<LingDramaWorkspaceSession | null>('lingdrama-workspace-session', () => null)
  const ready = useState<boolean>('lingdrama-workspace-session-ready', () => false)
  const isAuthenticated = computed(() => Boolean(session.value))

  function restore() {
    if (!import.meta.client || ready.value) return session.value
    session.value = readSession(localStorage, LOCAL_SESSION_KEY)
      || readSession(sessionStorage, TAB_SESSION_KEY)
    ready.value = true
    return session.value
  }

  function persist(next: LingDramaWorkspaceSession, remember: boolean) {
    if (!import.meta.client) return
    localStorage.removeItem(LOCAL_SESSION_KEY)
    sessionStorage.removeItem(TAB_SESSION_KEY)
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(remember ? LOCAL_SESSION_KEY : TAB_SESSION_KEY, JSON.stringify(next))
  }

  function signIn(account: string, password: string, remember = true) {
    const normalizedAccount = String(account || '').trim().toLowerCase()
    if (normalizedAccount !== WORKSPACE_ACCOUNT || password !== WORKSPACE_PASSWORD) return false

    const next: LingDramaWorkspaceSession = {
      version: 1,
      account: WORKSPACE_ACCOUNT,
      userId: 'lingdrama-studio-admin',
      signedInAt: new Date().toISOString(),
    }
    session.value = next
    ready.value = true
    persist(next, remember)
    return true
  }

  function signOut() {
    session.value = null
    ready.value = true
    if (!import.meta.client) return
    localStorage.removeItem(LOCAL_SESSION_KEY)
    sessionStorage.removeItem(TAB_SESSION_KEY)
  }

  restore()

  return {
    session,
    ready,
    isAuthenticated,
    restore,
    signIn,
    signOut,
  }
}
