import { useWorkspaceSession } from '~/composables/useWorkspaceSession'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const { isAuthenticated, canManageSettings, restore } = useWorkspaceSession()
  await restore()

  if (to.path === '/login') {
    if (!isAuthenticated.value) return
    // A redirect captured before authentication may reference a project from a
    // different workspace. The login page validates deep links after sign-in;
    // an already authenticated visitor gets the safe project index instead.
    return navigateTo('/', { replace: true })
  }

  const protectedPrefixes = ['/assets', '/tasks', '/settings', '/drama']
  const requiresSession = protectedPrefixes.some(prefix => (
    to.path === prefix || to.path.startsWith(`${prefix}/`)
  ))

  if (requiresSession && !isAuthenticated.value) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    }, { replace: true })
  }

  if (to.path.startsWith('/settings') && !canManageSettings.value) {
    return navigateTo('/', { replace: true })
  }
})
