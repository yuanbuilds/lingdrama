import { safeWorkspaceRedirect, useWorkspaceSession } from '~/composables/useWorkspaceSession'

export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return

  const { isAuthenticated, restore } = useWorkspaceSession()
  restore()

  if (to.path === '/login') {
    if (!isAuthenticated.value) return
    return navigateTo(safeWorkspaceRedirect(to.query.redirect, '/'), { replace: true })
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
})
