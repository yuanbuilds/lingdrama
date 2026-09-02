<template>
  <div class="studio-fullscreen">
    <header class="studio-shellbar">
      <button class="studio-brand" type="button" :aria-label="copy.home" @click="navigateTo('/')">
        <img :src="brandLogo" alt="" />
        <span><b>灵动</b><em>LingDrama</em></span>
      </button>

      <nav class="studio-shellnav" :aria-label="copy.navigation">
        <NuxtLink to="/showcase" class="studio-showcase-link" :title="copy.showcase" :aria-label="copy.showcase">
          <svg viewBox="0 0 24 24"><path d="M4 5.5h16v13H4z"/><path d="m10 9 5 3-5 3V9Z"/></svg>
          <span>{{ copy.showcase }}</span>
          <i></i>
        </NuxtLink>
        <NuxtLink to="/" :title="copy.projects" :aria-label="copy.projects">
          <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          <span>{{ copy.projects }}</span>
        </NuxtLink>
        <NuxtLink to="/assets" :title="copy.assets" :aria-label="copy.assets">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 4.5-4.5 3.2 3.2 2.1-2.1L20 19"/></svg>
          <span>{{ copy.assets }}</span>
        </NuxtLink>
        <NuxtLink to="/tasks" :title="copy.tasks" :aria-label="copy.tasks">
          <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="18" cy="18" r="3"/></svg>
          <span>{{ copy.tasks }}</span>
        </NuxtLink>
      </nav>

      <div class="studio-shell-actions">
        <span class="workspace-label">{{ currentWorkspace?.name || copy.workspace }}<i v-if="currentWorkspace?.region"> · {{ currentWorkspace.region }}</i></span>
        <button class="studio-locale" type="button" :title="localeTitle" @click="toggleLocale">
          {{ locale === 'zh-CN' ? 'EN' : '中' }}
        </button>
        <UserMenu compact />
      </div>
    </header>
    <div class="studio-stage">
      <slot />
    </div>
  </div>
</template>

<script setup>
import brandLogo from '~/assets/lingdrama-logo.svg'
import { useLingLocale } from '~/composables/useLingLocale'
import UserMenu from '~/components/UserMenu.vue'
import { useWorkspaceSession } from '~/composables/useWorkspaceSession'

const { locale, localeTitle, toggleLocale } = useLingLocale()
const { currentWorkspace } = useWorkspaceSession()
const copy = computed(() => locale.value === 'en-US' ? {
  home: 'LingDrama home', navigation: 'Studio navigation', showcase: 'Productions', projects: 'Projects', assets: 'Assets', tasks: 'Tasks', settings: 'Settings', workspace: 'PRODUCTION WORKSPACE',
} : {
  home: '返回灵动首页', navigation: '制作台导航', showcase: '作品', projects: '项目', assets: '资产', tasks: '任务', settings: '设置', workspace: '制作工作台',
})
</script>

<style scoped>
.studio-fullscreen {
  height: 100vh;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-base);
}
.studio-shellbar {
  position: relative;
  z-index: 30;
  height: 48px;
  flex: 0 0 48px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  background: rgba(6, 9, 15, 0.93);
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(18px);
}
.studio-shellbar::after {
  content: '';
  position: absolute;
  inset: auto 18px -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(94, 213, 255, 0.25), rgba(128, 105, 255, 0.18), transparent);
}
.studio-brand {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--text-0);
  background: none;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}
.studio-brand img { width: 29px; height: 29px; display: block; }
.studio-brand > span { display: flex; align-items: baseline; gap: 6px; white-space: nowrap; }
.studio-brand b { font-size: 13px; letter-spacing: 0.05em; }
.studio-brand em { color: var(--text-3); font-size: 10px; font-style: normal; font-weight: 600; }
.studio-shellnav { display: flex; align-items: center; gap: 3px; }
.studio-shellnav a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  color: var(--text-3);
  border-radius: 8px;
  text-decoration: none;
  font-size: 10px;
  font-weight: 600;
  transition: color 0.18s, background 0.18s;
}
.studio-shellnav a:hover,
.studio-shellnav a.router-link-active { color: var(--accent-text); background: var(--accent-bg); }
.studio-shellnav svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.studio-shellnav .studio-showcase-link {
  position: relative;
  color: #a7ddeb;
  border: 1px solid rgba(91, 207, 240, 0.11);
  background: linear-gradient(135deg, rgba(45, 186, 226, 0.09), rgba(101, 91, 232, 0.07));
}
.studio-shellnav .studio-showcase-link:hover,
.studio-shellnav .studio-showcase-link.router-link-active {
  color: #ecfbff;
  border-color: rgba(102, 218, 249, 0.22);
  background: linear-gradient(135deg, rgba(45, 196, 234, 0.16), rgba(101, 91, 232, 0.13));
}
.studio-showcase-link i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #65def5;
  box-shadow: 0 0 8px #65def5;
}
.studio-shell-actions { justify-self: end; display: flex; align-items: center; gap: 10px; }
.workspace-label { color: var(--text-3); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.workspace-label i { color: #8492a6; font-style: normal; font-weight: 500; letter-spacing: .06em; }
.studio-settings {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--text-3);
  border: 1px solid transparent;
  border-radius: 8px;
  transition: color .18s, background .18s, border-color .18s;
}
.studio-settings:hover,
.studio-settings.router-link-active { color: var(--text-2); background: rgba(255,255,255,.035); border-color: var(--border); }
.studio-settings svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.65; stroke-linecap: round; stroke-linejoin: round; }
.studio-locale {
  width: 30px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--text-2);
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
}
.studio-locale:hover { color: var(--accent-text); border-color: var(--border-strong); }
.studio-stage { flex: 1; min-height: 0; overflow: hidden; }
.studio-stage :deep(.studio) { height: 100%; }

@media (max-width: 720px) {
  .studio-shellbar { grid-template-columns: auto 1fr auto; padding: 0 10px; gap: 8px; }
  .studio-brand > span, .workspace-label, .studio-shellnav span { display: none; }
  .studio-shellnav { justify-self: center; }
  .studio-shellnav a { padding: 0 8px; }
  .studio-showcase-link i { position: absolute; top: 5px; right: 5px; }
  .studio-settings { display: none; }
}
</style>
