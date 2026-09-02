<template>
  <div class="app-shell">
    <header class="app-header">
      <button class="brand" type="button" :aria-label="copy.home" @click="navigateTo('/')">
        <span class="brand-mark">
          <img v-if="showBrandImage" :src="brandLogo" alt="" class="brand-logo" @error="showBrandImage = false" />
          <span v-else class="brand-fallback">L</span>
        </span>
        <span class="brand-copy">
          <span class="brand-title"><b>灵动</b><span>LingDrama</span></span>
          <span class="brand-caption">{{ copy.tagline }}</span>
        </span>
      </button>

      <nav class="primary-nav" :aria-label="copy.navigation">
        <NuxtLink to="/showcase" class="nav-link nav-link-showcase" :class="{ active: isActive('/showcase') }" :aria-label="copy.showcase">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v13H4z"/><path d="m10 9 5 3-5 3V9Z"/><path d="M8 2.8h8M9 21.2h6"/></svg>
          <span>{{ copy.showcase }}</span>
          <i class="showcase-signal"></i>
        </NuxtLink>
        <NuxtLink to="/" class="nav-link" :class="{ active: isActive('/') }" :aria-label="copy.projects">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          <span>{{ copy.projects }}</span>
        </NuxtLink>
        <NuxtLink to="/assets" class="nav-link" :class="{ active: isActive('/assets') }" :aria-label="copy.assets">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 4.5-4.5 3.2 3.2 2.1-2.1L20 19"/></svg>
          <span>{{ copy.assets }}</span>
        </NuxtLink>
        <NuxtLink to="/tasks" class="nav-link" :class="{ active: isActive('/tasks') }" :aria-label="copy.tasks">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="3"/></svg>
          <span>{{ copy.tasks }}</span>
        </NuxtLink>
      </nav>

      <div class="header-actions">
        <button class="locale-switch" type="button" :title="localeTitle" @click="toggleLocale">
          <span :class="{ active: locale === 'zh-CN' }">中</span>
          <i></i>
          <span :class="{ active: locale === 'en-US' }">EN</span>
        </button>
        <UserMenu />
      </div>
    </header>

    <main class="app-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import brandLogo from '~/assets/lingdrama-logo.svg'
import { useLingLocale } from '~/composables/useLingLocale'
import UserMenu from '~/components/UserMenu.vue'

const route = useRoute()
const showBrandImage = ref(true)
const { locale, localeTitle, toggleLocale } = useLingLocale()

const copy = computed(() => locale.value === 'en-US' ? {
  home: 'LingDrama home',
  navigation: 'Main navigation',
  tagline: 'AI SHORT DRAMA STUDIO',
  showcase: 'Productions',
  projects: 'Projects',
  assets: 'Assets',
  tasks: 'Tasks',
  settings: 'Settings',
} : {
  home: '返回灵动首页',
  navigation: '主导航',
  tagline: 'AI 短剧创作与制片平台',
  showcase: '作品',
  projects: '项目',
  assets: '资产',
  tasks: '任务',
  settings: '设置',
})

function isActive(path) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}
</script>

<style scoped>
.app-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-base);
}

.app-header {
  position: relative;
  z-index: 20;
  height: 68px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
  align-items: center;
  gap: 24px;
  padding: 0 30px;
  background: rgba(7, 10, 17, 0.86);
  border-bottom: 1px solid var(--border);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(22px) saturate(130%);
}

.app-header::after {
  content: '';
  position: absolute;
  left: 30px;
  right: 30px;
  bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(99, 211, 255, 0.3), rgba(121, 102, 255, 0.2), transparent);
  pointer-events: none;
}

.brand {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-self: start;
  gap: 11px;
  color: inherit;
  background: none;
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}
.brand:hover .brand-mark { border-color: rgba(109, 216, 255, 0.46); box-shadow: 0 0 24px rgba(85, 205, 255, 0.16); }
.brand-mark {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid rgba(126, 160, 213, 0.22);
  border-radius: 12px;
  background: rgba(15, 21, 34, 0.88);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.brand-logo { width: 31px; height: 31px; display: block; }
.brand-fallback { color: var(--accent); font-size: 16px; font-weight: 700; }
.brand-copy { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; line-height: 1; }
.brand-title { display: flex; align-items: baseline; gap: 7px; color: var(--text-0); white-space: nowrap; }
.brand-title b { font-size: 16px; font-weight: 700; letter-spacing: 0.04em; }
.brand-title span { color: var(--text-2); font-size: 12px; font-weight: 600; letter-spacing: 0.01em; }
.brand-caption { margin-top: 5px; color: var(--text-3); font-family: var(--font-mono); font-size: 8px; font-weight: 600; letter-spacing: 0.16em; }

.primary-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(137, 163, 203, 0.1);
  border-radius: 13px;
  background: rgba(14, 19, 31, 0.7);
}
.nav-link,
.settings-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 13px;
  color: var(--text-3);
  border: 1px solid transparent;
  border-radius: 9px;
  text-decoration: none;
  font-size: 12px;
  font-weight: 600;
  transition: color 0.18s, background 0.18s, border-color 0.18s;
}
.nav-link svg,
.settings-link svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.nav-link:hover,
.settings-link:hover { color: var(--text-1); background: rgba(255, 255, 255, 0.035); }
.nav-link.active {
  color: #d9f8ff;
  background: linear-gradient(135deg, rgba(66, 198, 255, 0.13), rgba(100, 103, 255, 0.1));
  border-color: rgba(99, 208, 255, 0.16);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
}
.nav-link.active::after {
  content: '';
  position: absolute;
  left: 13px;
  right: 13px;
  bottom: -5px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  box-shadow: 0 0 10px var(--accent);
}
.nav-link-showcase {
  padding-left: 12px;
  padding-right: 12px;
  color: #a4dbed;
  background: linear-gradient(135deg, rgba(53, 195, 232, 0.08), rgba(102, 92, 235, 0.07));
  border-color: rgba(95, 203, 240, 0.1);
}
.nav-link-showcase:hover {
  color: #e9fbff;
  border-color: rgba(94, 212, 250, 0.2);
  background: linear-gradient(135deg, rgba(53, 195, 232, 0.14), rgba(102, 92, 235, 0.11));
}
.nav-link-showcase.active {
  color: #f1fcff;
  background: linear-gradient(135deg, rgba(53, 207, 243, 0.2), rgba(105, 99, 244, 0.16));
  border-color: rgba(103, 220, 255, 0.28);
  box-shadow: 0 0 26px rgba(65, 198, 241, 0.1), inset 0 1px 0 rgba(255,255,255,0.06);
}
.showcase-signal {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #62def7;
  box-shadow: 0 0 10px rgba(98,222,247,0.9);
}

.header-actions { justify-self: end; display: flex; align-items: center; gap: 8px; }
.settings-link { min-height: 32px; padding: 0 9px; font-size: 11px; }
.settings-link.active { color: var(--accent-text); background: var(--accent-bg); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.locale-switch {
  height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  color: var(--text-3);
  background: rgba(15, 21, 34, 0.7);
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  transition: border-color 0.18s, color 0.18s;
}
.locale-switch:hover { color: var(--text-1); border-color: var(--border-strong); }
.locale-switch i { width: 1px; height: 11px; background: var(--border-strong); }
.locale-switch .active { color: var(--accent-text); }

.app-content { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }

@media (max-width: 900px) {
  .app-header { grid-template-columns: auto 1fr auto; gap: 12px; padding: 0 16px; }
  .app-header::after { left: 16px; right: 16px; }
  .brand-copy { display: none; }
  .primary-nav { justify-self: center; }
  .settings-link span { display: none; }
}

@media (max-width: 620px) {
  .app-header { height: 60px; gap: 8px; padding: 0 10px; }
  .app-header::after { left: 10px; right: 10px; }
  .brand-mark { width: 34px; height: 34px; }
  .brand-logo { width: 28px; height: 28px; }
  .primary-nav { gap: 1px; padding: 3px; }
  .nav-link { min-height: 32px; padding: 0 8px; }
  .nav-link span { display: none; }
  .nav-link-showcase { padding: 0 9px; }
  .showcase-signal { position: absolute; top: 5px; right: 5px; width: 4px; height: 4px; }
  .settings-link { display: none; }
  .locale-switch { padding: 0 8px; }
}
</style>
