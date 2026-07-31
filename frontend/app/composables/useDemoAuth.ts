import { computed } from 'vue'

export const DEMO_ACCOUNT = 'demo@lingdrama.ai'
export const DEMO_PASSWORD = 'LingDrama2026'

const LOCAL_SESSION_KEY = 'lingdrama.demo.session'
const TAB_SESSION_KEY = 'lingdrama.demo.tab-session'

export interface LingDramaDemoSession {
  version: 1
  account: string
  userId: string
  signedInAt: string
}

function isValidSession(value: unknown): value is LingDramaDemoSession {
  if (!value || typeof value !== 'object') return false
  const session = value as Partial<LingDramaDemoSession>
  return session.version === 1
    && session.account === DEMO_ACCOUNT
    && session.userId === 'lingdrama-demo-admin'
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

export function safeDemoRedirect(value: unknown, fallback = '/') {
  const target = Array.isArray(value) ? value[0] : value
  if (typeof target !== 'string') return fallback
  if (!/^\/(?!\/)/.test(target) || target.startsWith('/login')) return fallback
  return target
}

export function useDemoAuth() {
  const session = useState<LingDramaDemoSession | null>('lingdrama-demo-session', () => null)
  const ready = useState<boolean>('lingdrama-demo-session-ready', () => false)
  const isAuthenticated = computed(() => Boolean(session.value))

  function restore() {
    if (!import.meta.client || ready.value) return session.value
    session.value = readSession(localStorage, LOCAL_SESSION_KEY)
      || readSession(sessionStorage, TAB_SESSION_KEY)
    ready.value = true
    return session.value
  }

  function persist(next: LingDramaDemoSession, remember: boolean) {
    if (!import.meta.client) return
    localStorage.removeItem(LOCAL_SESSION_KEY)
    sessionStorage.removeItem(TAB_SESSION_KEY)
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(remember ? LOCAL_SESSION_KEY : TAB_SESSION_KEY, JSON.stringify(next))
  }

  function signIn(account: string, password: string, remember = true) {
    const normalizedAccount = String(account || '').trim().toLowerCase()
    if (normalizedAccount !== DEMO_ACCOUNT || password !== DEMO_PASSWORD) return false

    const next: LingDramaDemoSession = {
      version: 1,
      account: DEMO_ACCOUNT,
      userId: 'lingdrama-demo-admin',
      signedInAt: new Date().toISOString(),
    }
    session.value = next
    ready.value = true
    persist(next, remember)
    return true
  }

  function enterDemo(remember = true) {
    return signIn(DEMO_ACCOUNT, DEMO_PASSWORD, remember)
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
    enterDemo,
    signOut,
  }
}
