<template>
  <div ref="menuRoot" class="user-menu" :class="{ compact }">
    <NuxtLink v-if="!isAuthenticated" :to="loginTarget" class="sign-in-link" :aria-label="copy.signIn">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/><path d="M4 20c.8-3.5 3.1-5.5 7-5.5 2.1 0 3.8.6 5 1.8M18 10v6m-3-3h6"/></svg>
      <span>{{ copy.signIn }}</span>
    </NuxtLink>

    <template v-else>
      <button
        class="account-trigger"
        type="button"
        :aria-label="copy.accountMenu"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="avatar">
          <img v-if="currentUser?.avatar" :src="currentUser.avatar" alt="" />
          <span v-else>{{ initials }}</span>
          <i></i>
        </span>
        <span class="account-copy">
          <b>{{ currentUser?.name }}</b>
          <small>{{ currentWorkspace?.name || copy.workspace }}</small>
        </span>
        <svg class="chevron" :class="{ rotated: open }" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>

      <Transition name="menu-pop">
        <div v-if="open" class="account-popover" role="menu">
          <div class="identity-card">
            <span class="identity-avatar">
              <img v-if="currentUser?.avatar" :src="currentUser.avatar" alt="" />
              <span v-else>{{ initials }}</span>
            </span>
            <span>
              <b>{{ currentUser?.name }}</b>
              <small>{{ currentUser?.account }}</small>
            </span>
            <em><i></i>{{ copy.online }}</em>
          </div>

          <div class="workspace-card">
            <span class="workspace-mark"><i></i><i></i><i></i></span>
            <span>
              <small>{{ copy.currentWorkspace }}</small>
              <b>{{ currentWorkspace?.name || copy.workspace }}</b>
            </span>
            <em>{{ currentWorkspace?.region || currentUser?.region }}</em>
          </div>

          <div v-if="canManageSettings && workspaces.length > 1" class="workspace-switcher">
            <span>{{ copy.switchWorkspace }}</span>
            <button
              v-for="workspace in workspaces"
              :key="workspace.id"
              type="button"
              :class="{ active: String(workspace.id) === String(currentWorkspace?.id) }"
              :disabled="switchingWorkspace"
              @click="changeWorkspace(workspace.id)"
            >
              <i>{{ workspaceInitial(workspace.name) }}</i>
              <span><b>{{ workspace.name }}</b><small>{{ workspace.region }}<template v-if="workspace.role"> · {{ workspaceRole(workspace.role) }}</template></small></span>
              <em v-if="String(workspace.id) === String(currentWorkspace?.id)">✓</em>
            </button>
          </div>

          <div class="identity-meta">
            <span>{{ copy.role }}</span><b>{{ roleLabel }}</b>
            <span>{{ copy.region }}</span><b>{{ currentWorkspace?.region || currentUser?.region }}</b>
            <template v-for="metric in usageMetrics" :key="metric.label">
              <span>{{ metric.label }}</span><b>{{ metric.value }}</b>
            </template>
          </div>

          <div class="menu-section">
            <NuxtLink to="/showcase" role="menuitem" @click="close">
              <svg viewBox="0 0 24 24"><path d="M4 5.5h16v13H4z"/><path d="m10 9 5 3-5 3V9Z"/></svg>
              <span>{{ copy.showcase }}</span>
            </NuxtLink>
            <NuxtLink v-if="canManageSettings" to="/settings" role="menuitem" @click="close">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.4 3h-4l-.4 3a8 8 0 0 0-1.8 1l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2.1l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 3h4l.4-3a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/></svg>
              <span>{{ copy.settings }}</span>
            </NuxtLink>
            <button type="button" role="menuitem" @click="toggleLocale">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21M12 3c-2.4 2.5-3.5 5.5-3.5 9S9.6 18.5 12 21"/></svg>
              <span>{{ copy.language }}</span>
              <em class="menu-value">{{ locale === 'zh-CN' ? 'EN' : '中' }}</em>
            </button>
          </div>

          <div class="menu-section menu-footer">
            <button class="sign-out" type="button" role="menuitem" @click="logout">
              <svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9"/></svg>
              <span>{{ copy.signOut }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceSession } from '~/composables/useWorkspaceSession'
import { useLingLocale } from '~/composables/useLingLocale'

defineProps<{ compact?: boolean }>()

const route = useRoute()
const menuRoot = ref<HTMLElement | null>(null)
const open = ref(false)
const { isAuthenticated, currentUser, currentWorkspace, canManageSettings, workspaces, usage, signOut, switchWorkspace } = useWorkspaceSession()
const { locale, toggleLocale } = useLingLocale()
const switchingWorkspace = ref(false)

const copy = computed(() => locale.value === 'en-US' ? {
  signIn: 'Sign in', accountMenu: 'Open account menu', workspace: 'Production workspace', currentWorkspace: 'CURRENT WORKSPACE',
  role: 'Role', region: 'Region', online: 'Signed in', switchWorkspace: 'SWITCH WORKSPACE', showcase: 'Productions', settings: 'Settings', language: 'Switch language', signOut: 'Sign out',
} : {
  signIn: '登录', accountMenu: '打开用户菜单', workspace: '制作工作区', currentWorkspace: '当前工作区',
  role: '角色', region: '地区', online: '已登录', switchWorkspace: '切换工作区', showcase: '作品中心', settings: '系统设置', language: '切换语言', signOut: '退出登录',
})

const initials = computed(() => {
  const name = currentUser.value?.name || 'LD'
  const words = name.trim().split(/\s+/)
  return (words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : name.slice(0, 2)).toUpperCase()
})

const roleLabel = computed(() => {
  const role = String(currentUser.value?.role || '')
  const known = role.toLowerCase()
  if (locale.value === 'zh-CN') {
    if (['admin', 'administrator', 'platform_admin'].includes(known)) return '平台管理员'
    if (known === 'owner') return '工作区负责人'
    if (known.includes('executive producer')) return '执行制片人'
    if (known.includes('development producer')) return '开发制片人'
    if (known.includes('creative producer')) return '创意制片人'
    if (known.includes('producer')) return '制片人'
    if (known.includes('director')) return '导演'
    if (known.includes('editor')) return '后期制作'
  }
  return role || (locale.value === 'en-US' ? 'Producer' : '制作成员')
})

const usageMetrics = computed(() => {
  const source = usage.value?.summary || usage.value
  if (!source || typeof source !== 'object') return []
  const result = []
  if (source.total_requests != null) result.push({ label: locale.value === 'en-US' ? 'Total requests' : '总调用', value: Number(source.total_requests).toLocaleString(locale.value) })
  if (source.total_tokens != null) result.push({ label: locale.value === 'en-US' ? 'Tokens' : '总 Token', value: Number(source.total_tokens).toLocaleString(locale.value) })
  return result
})

function workspaceInitial(name) {
  return String(name || 'LD').replace(/[\s·]+/g, '').slice(0, 2).toUpperCase()
}

function workspaceRole(role) {
  const value = String(role || '').toLowerCase()
  if (locale.value === 'zh-CN') return value === 'owner' ? '负责人' : value === 'platform_admin' ? '运营' : '制作成员'
  return value === 'platform_admin' ? 'Operations' : value === 'owner' ? 'Lead' : 'Member'
}

async function changeWorkspace(id) {
  if (String(id) === String(currentWorkspace.value?.id) || switchingWorkspace.value) return
  switchingWorkspace.value = true
  try {
    await switchWorkspace(id)
    close()
    await navigateTo('/', { replace: true })
    if (import.meta.client) window.location.reload()
  } finally {
    switchingWorkspace.value = false
  }
}

const loginTarget = computed(() => ({
  path: '/login',
  query: route.path === '/' ? undefined : { redirect: route.fullPath },
}))

function close() {
  open.value = false
}

async function logout() {
  await signOut()
  close()
  await navigateTo('/login')
}

function onPointerDown(event: PointerEvent) {
  if (open.value && !menuRoot.value?.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch(() => route.fullPath, close)
onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.user-menu { position: relative; display: flex; align-items: center; }
.sign-in-link {
  height: 34px; display: inline-flex; align-items: center; gap: 7px; padding: 0 13px;
  color: #dff9ff; border: 1px solid rgba(100, 213, 255, .22); border-radius: 9px;
  background: linear-gradient(135deg, rgba(65, 202, 244, .14), rgba(103, 92, 237, .12));
  text-decoration: none; font-size: 11px; font-weight: 700; transition: .18s ease;
}
.sign-in-link:hover { border-color: rgba(104, 220, 255, .42); box-shadow: 0 0 22px rgba(74, 195, 239, .11); transform: translateY(-1px); }
.sign-in-link svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.account-trigger {
  min-width: 168px; height: 40px; display: flex; align-items: center; gap: 9px; padding: 4px 9px 4px 5px;
  color: var(--text-1); background: rgba(14, 20, 32, .74); border: 1px solid var(--border); border-radius: 12px;
  cursor: pointer; text-align: left; transition: border-color .18s, background .18s, box-shadow .18s;
}
.account-trigger:hover, .account-trigger[aria-expanded="true"] { background: rgba(19, 27, 43, .92); border-color: rgba(113, 200, 233, .25); box-shadow: 0 8px 25px rgba(0,0,0,.18); }
.avatar { width: 30px; height: 30px; flex: 0 0 auto; display: grid; place-items: center; position: relative; overflow: visible; color: #071019; border-radius: 9px; background: linear-gradient(135deg,#d8eef2,#7b91b5); font-size: 10px; font-weight: 800; }
.avatar > img, .identity-avatar > img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
.avatar i { width: 7px; height: 7px; position: absolute; right: -2px; bottom: -2px; border: 2px solid #0d1320; border-radius: 50%; background: #52dda0; }
.account-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
.account-copy b { overflow: hidden; color: var(--text-1); font-size: 10px; font-weight: 700; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
.account-copy small { color: var(--text-3); font-size: 8px; line-height: 1.3; }
.chevron { width: 13px; height: 13px; fill: none; stroke: var(--text-3); stroke-width: 1.8; transition: transform .18s; }
.chevron.rotated { transform: rotate(180deg); }
.account-popover {
  width: 252px; position: absolute; z-index: 100; top: calc(100% + 10px); right: 0; padding: 8px;
  border: 1px solid rgba(139, 174, 220, .18); border-radius: 14px;
  background: rgba(10, 15, 25, .97); box-shadow: 0 28px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.035);
  backdrop-filter: blur(24px) saturate(135%);
}
.identity-card { min-height: 62px; display: grid; grid-template-columns: 34px minmax(0,1fr) auto; align-items: center; gap: 9px; padding: 9px; border: 1px solid rgba(130,164,211,.1); border-radius: 10px; background: linear-gradient(135deg,rgba(61,183,229,.07),rgba(103,88,226,.06)); }
.identity-avatar { width: 34px; height: 34px; display: grid; place-items: center; color: #08111a; border-radius: 10px; background: linear-gradient(135deg,#d8eef2,#7b91b5); font-size: 10px; font-weight: 800; }
.identity-card > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; }
.identity-card b { color: var(--text-1); font-size: 10px; }
.identity-card small { overflow: hidden; color: var(--text-3); font-size: 8px; text-overflow: ellipsis; }
.identity-card em { display: inline-flex; align-items: center; gap: 4px; color: #71dbac; font-size: 8px; font-style: normal; }
.identity-card em i { width: 5px; height: 5px; border-radius: 50%; background: #53dda0; box-shadow: 0 0 8px rgba(83,221,160,.7); }
.workspace-card { min-height: 56px; display: grid; grid-template-columns: 31px minmax(0,1fr) auto; align-items: center; gap: 9px; margin-top: 7px; padding: 9px; border: 1px solid rgba(132,161,201,.1); border-radius: 10px; background: rgba(255,255,255,.018); }
.workspace-mark { width: 31px; height: 31px; display: flex; align-items: flex-end; justify-content: center; gap: 2px; padding-bottom: 8px; border-radius: 9px; color: #b9c6d8; background: rgba(255,255,255,.035); }
.workspace-mark i { width: 3px; border-radius: 3px; background: currentColor; }.workspace-mark i:nth-child(1){height:7px}.workspace-mark i:nth-child(2){height:13px}.workspace-mark i:nth-child(3){height:9px}
.workspace-card > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; }.workspace-card small { color: var(--text-3); font: 650 7px var(--font-mono); letter-spacing: .1em; }.workspace-card b { overflow: hidden; margin-top: 2px; color: var(--text-1); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.workspace-card em { max-width: 62px; overflow: hidden; padding: 3px 6px; color: #9db1ca; border: 1px solid rgba(142,168,205,.12); border-radius: 999px; font-size: 7px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.workspace-switcher { max-height: 228px; overflow-y: auto; margin-top: 7px; padding: 7px; border: 1px solid rgba(132,161,201,.1); border-radius: 10px; background: rgba(3,7,13,.34); }.workspace-switcher > span { display: block; padding: 2px 4px 6px; color: var(--text-3); font: 650 7px var(--font-mono); letter-spacing: .11em; }.workspace-switcher button { width: 100%; min-height: 43px; display: grid; grid-template-columns: 27px minmax(0,1fr) auto; align-items: center; gap: 8px; padding: 5px 6px; color: var(--text-2); border: 0; border-radius: 8px; background: transparent; cursor: pointer; text-align: left; }.workspace-switcher button:hover,.workspace-switcher button.active { color: var(--text-0); background: rgba(255,255,255,.045); }.workspace-switcher button > i { width: 27px; height: 27px; display: grid; place-items: center; border-radius: 8px; color: #a9b9cd; background: rgba(139,161,193,.1); font-size: 7px; font-style: normal; font-weight: 750; }.workspace-switcher button > span { min-width: 0; display: flex; flex-direction: column; }.workspace-switcher button b,.workspace-switcher button small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.workspace-switcher button b { font-size: 8px; }.workspace-switcher button small { color: var(--text-3); font-size: 7px; }.workspace-switcher button > em { color: var(--success); font-size: 9px; font-style: normal; }
.identity-meta { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; padding: 9px 10px 4px; }.identity-meta span { color: var(--text-3); font-size: 8px; }.identity-meta b { overflow: hidden; color: var(--text-2); font-size: 8px; font-weight: 600; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
.menu-section { padding: 6px 0; }
.menu-section + .menu-section { border-top: 1px solid rgba(139,166,207,.1); }
.menu-section a, .menu-section button { width: 100%; min-height: 36px; display: flex; align-items: center; gap: 9px; padding: 0 9px; color: var(--text-2); background: none; border: 0; border-radius: 8px; cursor: pointer; text-decoration: none; font-size: 10px; text-align: left; transition: color .16s, background .16s; }
.menu-section a:hover, .menu-section button:hover { color: var(--text-0); background: rgba(255,255,255,.045); }
.menu-section svg { width: 14px; height: 14px; flex: 0 0 auto; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.menu-value { margin-left: auto; color: var(--accent-text); font-style: normal; font-size: 9px; font-weight: 700; }
.menu-footer { padding-bottom: 0; }
.menu-section .sign-out { color: #e18b98; }
.menu-section .sign-out:hover { color: #ff9bac; background: rgba(255,91,116,.07); }
.compact .account-trigger { min-width: 0; width: 34px; height: 34px; padding: 2px; border-radius: 10px; }
.compact .avatar { width: 28px; height: 28px; }
.compact .account-copy, .compact .chevron { display: none; }
.compact .sign-in-link { width: 34px; padding: 0; justify-content: center; }
.compact .sign-in-link span { display: none; }
.menu-pop-enter-active, .menu-pop-leave-active { transition: opacity .15s, transform .15s var(--ease-out); transform-origin: top right; }
.menu-pop-enter-from, .menu-pop-leave-to { opacity: 0; transform: translateY(-5px) scale(.98); }
@media (max-width: 760px) {
  .account-trigger { min-width: 0; width: 34px; height: 34px; padding: 2px; border-radius: 10px; }
  .account-trigger .avatar { width: 28px; height: 28px; }
  .account-copy, .chevron { display: none; }
  .sign-in-link { width: 34px; padding: 0; justify-content: center; }
  .sign-in-link span { display: none; }
  .account-popover { position: fixed; top: 58px; right: 10px; }
}
</style>
