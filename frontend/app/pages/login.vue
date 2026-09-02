<template>
  <div class="login-page">
    <div class="login-grid" aria-hidden="true"></div>
    <div class="login-orb login-orb-a" aria-hidden="true"></div>
    <div class="login-orb login-orb-b" aria-hidden="true"></div>

    <header class="login-header">
      <button class="login-brand" type="button" :aria-label="copy.home" @click="navigateTo('/')">
        <span class="brand-mark"><img :src="brandLogo" alt="" /></span>
        <span class="brand-words">
          <span><b>灵动</b><em>LingDrama</em></span>
          <small>{{ copy.tagline }}</small>
        </span>
      </button>
      <button class="login-locale" type="button" :title="localeTitle" @click="toggleLocale">
        <span :class="{ active: locale === 'zh-CN' }">中</span><i></i><span :class="{ active: locale === 'en-US' }">EN</span>
      </button>
    </header>

    <main class="login-shell">
      <section class="story-panel">
        <video
          v-if="featureVideo"
          :src="featureVideo"
          :poster="featurePoster || undefined"
          muted
          loop
          autoplay
          playsinline
          preload="metadata"
        ></video>
        <img v-else-if="featurePoster" :src="featurePoster" :alt="featuredProject?.title || ''" />
        <div v-else class="story-fallback" aria-hidden="true">
          <span class="frame frame-one"></span><span class="frame frame-two"></span><span class="frame frame-three"></span>
          <i class="play-orbit"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg></i>
        </div>
        <div class="story-shade"></div>
        <div class="story-vignette"></div>
        <div class="frame-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>

        <div class="story-copy">
          <span class="story-eyebrow"><i></i> LINGDRAMA / PRODUCTION ACCESS</span>
          <h1>{{ copy.storyTitle }}</h1>
          <p>{{ copy.storyDescription }}</p>
        </div>

        <div v-if="featuredProject" class="release-card">
          <div class="release-top">
            <span>{{ copy.latestRelease }}</span>
            <em><i></i>{{ isDeliverable ? copy.ready : copy.inProduction }}</em>
          </div>
          <strong>{{ featuredProject.title }}</strong>
          <div class="release-metrics">
            <span><b>{{ featuredProject.episodes?.length || 0 }}</b>{{ copy.episodes }}</span>
            <i></i>
            <span><b>{{ featuredProject.characters?.length || 0 }}</b>{{ copy.characters }}</span>
            <i></i>
            <span><b>{{ shotCount }}</b>{{ copy.shots }}</span>
          </div>
        </div>

        <div class="workflow-line" :aria-label="copy.workflow">
          <span v-for="(item, index) in copy.stages" :key="item">
            <i>{{ String(index + 1).padStart(2, '0') }}</i><b>{{ item }}</b>
          </span>
        </div>
      </section>

      <section class="access-panel">
        <div class="access-status"><i></i>{{ copy.workspaceOnline }}</div>
        <div class="access-heading">
          <span>LINGDRAMA · AI STUDIO</span>
          <h2>{{ copy.welcome }}</h2>
          <p>{{ copy.signInDescription }}</p>
        </div>

        <form class="login-form" @submit.prevent="submit">
          <label class="login-field">
            <span>{{ copy.account }}</span>
            <div :class="{ invalid: errorMessage }">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"/></svg>
              <input
                v-model="form.account"
                type="email"
                inputmode="email"
                autocomplete="username"
                :placeholder="copy.accountPlaceholder"
                :aria-invalid="Boolean(errorMessage)"
                required
                @input="clearError"
              />
            </div>
          </label>

          <label class="login-field">
            <span>{{ copy.password }}</span>
            <div :class="{ invalid: errorMessage }">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :placeholder="copy.passwordPlaceholder"
                :aria-invalid="Boolean(errorMessage)"
                required
                @input="clearError"
              />
              <button class="password-toggle" type="button" :aria-label="showPassword ? copy.hidePassword : copy.showPassword" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" viewBox="0 0 24 24"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
                <svg v-else viewBox="0 0 24 24"><path d="m4 4 16 16M10.5 6.2c.5-.1 1-.2 1.5-.2 6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M7 7.4C4.2 9.2 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
              </button>
            </div>
          </label>

          <label class="remember-option">
            <input v-model="form.remember" type="checkbox" />
            <span><i><svg viewBox="0 0 16 16"><path d="m3.5 8 3 3 6-6"/></svg></i>{{ copy.remember }}</span>
          </label>

          <p v-if="errorMessage" class="login-error" role="alert">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/></svg>
            {{ errorMessage }}
          </p>

          <button class="submit-button" type="submit" :disabled="busy">
            <span v-if="busy" class="button-spinner"></span>
            <svg v-else viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            {{ busy ? copy.entering : copy.signIn }}
          </button>
        </form>

        <div class="workspace-access-card">
          <span class="workspace-access-icon">
            <svg viewBox="0 0 24 24"><path d="M5 20V7l7-4 7 4v13M9 20v-4h6v4M9 9h.01M15 9h.01M9 12.5h.01M15 12.5h.01"/></svg>
          </span>
          <span>
            <b>{{ copy.accessTitle }}</b>
            <small>{{ copy.accessDescription }}</small>
          </span>
          <em>{{ copy.accessBadge }}</em>
        </div>

        <p class="account-help">{{ copy.accountHelp }}</p>
        <NuxtLink class="back-link" to="/"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>{{ copy.backHome }}</NuxtLink>
      </section>
    </main>

    <footer class="login-footer">
      <span>© {{ new Date().getFullYear() }} 灵动 LingDrama</span>
      <span>{{ copy.footer }}</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import brandLogo from '~/assets/lingdrama-logo.svg'
import { dramaAPI } from '~/composables/useApi'
import { safeWorkspaceRedirect, useWorkspaceSession } from '~/composables/useWorkspaceSession'
import { useLingLocale } from '~/composables/useLingLocale'

definePageMeta({ layout: false })

const route = useRoute()
const { locale, localeTitle, toggleLocale } = useLingLocale()
const { signIn } = useWorkspaceSession()
const form = reactive({ account: '', password: '', remember: true })
const showPassword = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const featuredProject = ref<any>(null)

const copy = computed(() => locale.value === 'en-US' ? {
  home: 'LingDrama home', tagline: 'AI SHORT DRAMA PRODUCTION', storyTitle: 'From source story\nto delivery-ready drama.',
  storyDescription: 'Story, characters, shots, video, and final delivery stay connected in one production workspace.',
  latestRelease: 'LATEST RELEASE', ready: 'READY TO DELIVER', inProduction: 'IN PRODUCTION', episodes: 'EPISODES', characters: 'CHARACTERS', shots: 'SHOTS', workflow: 'Production workflow',
  stages: ['Story', 'World', 'Shots', 'Video', 'Delivery'], workspaceOnline: 'System operational', welcome: 'Sign in to LingDrama', signInDescription: 'Continue with your work account.',
  account: 'Account', accountPlaceholder: 'Account or email', password: 'Password', passwordPlaceholder: 'Password', showPassword: 'Show password', hidePassword: 'Hide password', remember: 'Stay signed in',
  signIn: 'Sign in', entering: 'Signing in…', invalid: 'Incorrect account or password. Please try again.', unavailable: 'The sign-in service is temporarily unavailable. Please try again shortly.',
  required: 'Enter your account and password to continue.',
  accessTitle: 'LingDrama Production Center', accessDescription: 'Accounts are managed by your organization administrator.', accessBadge: 'ORG WORKSPACE', accountHelp: 'For account access or password assistance, contact your system administrator.', backHome: 'Back to home', footer: 'AI SHORT DRAMA PRODUCTION STUDIO',
} : {
  home: '返回灵动首页', tagline: 'AI 短剧创作与制片平台', storyTitle: '从故事原文，\n到可交付短剧。',
  storyDescription: '创作、角色、分镜、视频与成片，始终在同一个制作空间内协同。',
  latestRelease: '最新成果 / LATEST RELEASE', ready: '可交付', inProduction: '制作中', episodes: '剧集', characters: '角色', shots: '镜头', workflow: '短剧生产流程',
  stages: ['故事', '世界', '分镜', '视频', '交付'], workspaceOnline: '系统服务正常', welcome: '登录灵动工作台', signInDescription: '使用您的工作账号继续',
  account: '账号', accountPlaceholder: '请输入账号或邮箱', password: '密码', passwordPlaceholder: '请输入密码', showPassword: '显示密码', hidePassword: '隐藏密码', remember: '保持登录状态',
  signIn: '登录', entering: '正在登录…', invalid: '账号或密码不正确，请重新输入。', unavailable: '登录服务暂时不可用，请稍后重试。',
  required: '请输入账号和密码后继续。',
  accessTitle: '灵动制作中心', accessDescription: '工作账号由组织管理员统一分配', accessBadge: '组织工作空间', accountHelp: '如需开通账号或重置密码，请联系系统管理员。', backHome: '返回首页', footer: 'AI SHORT DRAMA PRODUCTION STUDIO',
})

useHead(() => ({ title: `${copy.value.welcome} · 灵动 LingDrama` }))

const featureVideo = computed(() => mediaUrl(featuredProject.value?.preview_video || featuredProject.value?.previewVideo))
const featurePoster = computed(() => {
  const project = featuredProject.value
  if (!project) return ''
  return mediaUrl([
    project.preview_image, project.previewImage, project.thumbnail,
    ...(project.scenes || []).flatMap((scene: any) => [scene.image_url, scene.imageUrl]),
    ...(project.characters || []).flatMap((character: any) => [character.image_url, character.imageUrl]),
  ].find(Boolean))
})
const shotCount = computed(() => Number(featuredProject.value?.production_summary?.shots || 0))
const isDeliverable = computed(() => Boolean(featuredProject.value?.production_summary?.final_ready || featureVideo.value))

function mediaUrl(value: unknown) {
  if (!value) return ''
  const url = String(value)
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return url.startsWith('/') ? url : `/${url}`
}

function clearError() {
  errorMessage.value = ''
}

async function destination() {
  const target = safeWorkspaceRedirect(route.query.redirect, '/')
  const projectMatch = target.match(/^\/drama\/(\d+)(?:\/|$)/)
  if (!projectMatch) return target

  // Public calls-to-action may point at the featured production. After sign-in,
  // keep that deep link only when the active workspace can actually access it.
  // This prevents a customer account from landing on another workspace's 404.
  try {
    const response = await dramaAPI.list()
    const projects = Array.isArray(response) ? response : (response?.items || [])
    if (projects.some((project: any) => Number(project.id) === Number(projectMatch[1]))) return target
  } catch {
    // The project index is the stable recovery route if access cannot be proven.
  }
  return '/'
}

async function finishEntry() {
  await navigateTo(await destination(), { replace: true })
}

async function submit() {
  if (busy.value) return
  clearError()
  if (!form.account.trim() || !form.password) {
    errorMessage.value = copy.value.required
    return
  }
  busy.value = true
  const result = await signIn(form.account, form.password, form.remember)
  if (!result.ok) {
    errorMessage.value = /network|fetch|service|endpoint|503|502|500/i.test(result.message)
      ? copy.value.unavailable
      : copy.value.invalid
    busy.value = false
    return
  }
  await finishEntry()
}

async function loadFeature() {
  try {
    const response = await dramaAPI.list()
    const projects = Array.isArray(response) ? response : (response?.items || [])
    featuredProject.value = projects.find((project: any) => /^(?:第)?\s*59\s*秒|the\s*59(?:th)?\s*second/i.test(String(project?.title || '').trim()))
      || projects.find((project: any) => project.production_summary?.final_ready || project.preview_video)
      || projects.find((project: any) => Number(project.production_summary?.shots || 0) > 0)
      || projects[0]
      || null
  } catch {
    featuredProject.value = null
  }
}

onMounted(loadFeature)
</script>

<style scoped>
.login-page { min-height: 100%; height: 100%; overflow-y: auto; position: relative; color: var(--text-0); background: linear-gradient(145deg,#060910 0%,#090e19 50%,#070a12 100%); }
.login-grid { position: fixed; inset: 0; opacity: .2; pointer-events: none; background-image: linear-gradient(rgba(106,144,200,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(106,144,200,.055) 1px,transparent 1px); background-size: 72px 72px; mask-image: linear-gradient(to bottom,black,transparent 88%); }
.login-orb { width: 380px; height: 380px; position: fixed; pointer-events: none; border-radius: 50%; filter: blur(105px); opacity: .15; }
.login-orb-a { top: -190px; left: -120px; background: #39c8ff; }.login-orb-b { right: -100px; bottom: -230px; background: #735dff; }
.login-header { width: min(1480px,calc(100% - 64px)); height: 78px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 5; border-bottom: 1px solid rgba(134,163,207,.11); }
.login-brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; background: none; border: 0; cursor: pointer; text-align: left; }
.brand-mark { width: 40px; height: 40px; display: grid; place-items: center; border: 1px solid rgba(130,171,222,.22); border-radius: 12px; background: rgba(15,22,36,.86); box-shadow: inset 0 1px rgba(255,255,255,.04); }
.brand-mark img { width: 32px; height: 32px; }.brand-words { display: flex; flex-direction: column; gap: 4px; }.brand-words > span { display: flex; align-items: baseline; gap: 7px; line-height: 1; }.brand-words b { font-size: 16px; letter-spacing: .05em; }.brand-words em { color: var(--text-2); font-size: 12px; font-style: normal; font-weight: 600; }.brand-words small { color: var(--text-3); font: 600 8px var(--font-mono); letter-spacing: .15em; }
.login-locale { height: 32px; display: flex; align-items: center; gap: 8px; padding: 0 11px; color: var(--text-3); background: rgba(14,20,32,.66); border: 1px solid var(--border); border-radius: 9px; cursor: pointer; font-size: 10px; font-weight: 700; }.login-locale i { width: 1px; height: 11px; background: var(--border-strong); }.login-locale .active { color: var(--accent-text); }
.login-shell { width: min(1370px,calc(100% - 64px)); min-height: calc(100% - 130px); margin: 0 auto; padding: 32px 0 28px; display: grid; grid-template-columns: minmax(0,1.25fr) minmax(400px,.75fr); align-items: stretch; gap: clamp(38px,5vw,82px); position: relative; z-index: 2; }
.story-panel { min-height: 650px; overflow: hidden; position: relative; border: 1px solid rgba(135,169,217,.15); border-radius: 24px; background: #0a0f19; box-shadow: 0 35px 100px rgba(0,0,0,.34); isolation: isolate; }
.story-panel > video,.story-panel > img { width: 100%; height: 100%; position: absolute; inset: 0; object-fit: cover; opacity: .86; }.story-shade { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(4,7,12,.88) 0%,rgba(5,8,14,.42) 48%,rgba(5,8,14,.15) 100%),linear-gradient(0deg,rgba(5,8,14,.96) 0%,transparent 54%,rgba(5,8,14,.28) 100%); }.story-vignette { position: absolute; inset: 0; box-shadow: inset 0 0 130px rgba(0,0,0,.68); }
.story-fallback { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(circle at 64% 32%,rgba(68,128,223,.24),transparent 31%),linear-gradient(135deg,#101a2a,#080d17); }.story-fallback::before { content:''; position:absolute; inset:0; opacity:.18; background-image:linear-gradient(rgba(111,151,214,.15) 1px,transparent 1px),linear-gradient(90deg,rgba(111,151,214,.15) 1px,transparent 1px);background-size:55px 55px; }.frame { width: 31%; aspect-ratio: 16/10; position: absolute; border: 1px solid rgba(112,176,222,.19); border-radius: 12px; background: rgba(26,49,78,.18); }.frame-one { left: 12%; top: 26%; transform: rotate(-7deg); }.frame-two { left: 34%; top: 21%; z-index: 1; }.frame-three { right: 12%; top: 29%; transform: rotate(7deg); }.play-orbit { width: 74px; height: 74px; display:grid;place-items:center;position:relative;z-index:2;border:1px solid rgba(104,218,255,.35);border-radius:50%;background:rgba(9,19,32,.72);box-shadow:0 0 0 22px rgba(91,151,234,.04),0 0 55px rgba(75,184,238,.19); }.play-orbit svg { width:27px;height:27px;fill:none;stroke:#a3efff;stroke-width:1.4; }
.frame-corners i { width:24px;height:24px;position:absolute;border-color:rgba(121,221,248,.5);border-style:solid; }.frame-corners i:nth-child(1){left:17px;top:17px;border-width:1px 0 0 1px}.frame-corners i:nth-child(2){right:17px;top:17px;border-width:1px 1px 0 0}.frame-corners i:nth-child(3){left:17px;bottom:17px;border-width:0 0 1px 1px}.frame-corners i:nth-child(4){right:17px;bottom:17px;border-width:0 1px 1px 0}
.story-copy { max-width: 560px; position: absolute; z-index: 2; left: clamp(35px,5vw,72px); top: clamp(52px,9vh,100px); }.story-eyebrow { display:flex;align-items:center;gap:10px;color:#94dff1;font:700 9px var(--font-mono);letter-spacing:.18em; }.story-eyebrow i{width:28px;height:1px;background:#59d8f8;box-shadow:0 0 10px #59d8f8}.story-copy h1{max-width:530px;margin:25px 0 19px;white-space:pre-line;font-size:clamp(40px,4.4vw,68px);font-weight:600;line-height:1.02;letter-spacing:-.05em;text-wrap:balance}.story-copy p{max-width:500px;color:#a3afc2;font-size:13px;line-height:1.85}
.release-card { min-width: 330px; position:absolute;z-index:2;left:clamp(35px,5vw,72px);bottom:100px;padding:17px 19px;border:1px solid rgba(127,164,216,.15);border-radius:14px;background:rgba(7,12,21,.72);box-shadow:0 18px 40px rgba(0,0,0,.27);backdrop-filter:blur(18px); }.release-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px}.release-top>span{color:#6f7e96;font:700 8px var(--font-mono);letter-spacing:.14em}.release-top em{display:flex;align-items:center;gap:5px;color:#77dbad;font-size:8px;font-style:normal;font-weight:700}.release-top em i{width:5px;height:5px;border-radius:50%;background:#56dfa2;box-shadow:0 0 9px rgba(86,223,162,.75)}.release-card>strong{display:block;max-width:420px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px}.release-metrics{display:flex;align-items:center;gap:13px;margin-top:13px}.release-metrics>i{width:1px;height:18px;background:rgba(144,174,216,.13)}.release-metrics span{display:flex;align-items:baseline;gap:5px;color:#738098;font-size:7px;letter-spacing:.07em}.release-metrics b{color:#dfe8f7;font-size:12px}
.workflow-line { height:55px;position:absolute;z-index:2;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid rgba(128,159,205,.13);background:rgba(5,9,16,.82);backdrop-filter:blur(15px); }.workflow-line span{display:flex;align-items:center;justify-content:center;gap:8px;position:relative;color:#7c899f;font-size:8px;font-weight:600}.workflow-line span+span::before{content:'';width:1px;height:18px;position:absolute;left:0;background:rgba(136,165,208,.12)}.workflow-line i{color:#56d4f5;font:700 7px var(--font-mono);font-style:normal}.workflow-line b{font-size:8px}
.access-panel { width:100%;max-width:470px;margin:auto;padding:20px 0; }.access-status{display:inline-flex;align-items:center;gap:7px;margin-bottom:24px;color:#6ecfa7;font-size:9px;font-weight:700;letter-spacing:.05em}.access-status i{width:6px;height:6px;border-radius:50%;background:#54dda0;box-shadow:0 0 11px rgba(84,221,160,.75)}.access-heading>span{color:#66758f;font:700 8px var(--font-mono);letter-spacing:.17em}.access-heading h2{margin:11px 0 5px;font-size:32px;letter-spacing:-.035em}.access-heading p{color:var(--text-3);font-size:12px}.login-form{margin-top:27px}.login-field{display:block;margin-bottom:16px}.login-field>span{display:block;margin-bottom:7px;color:var(--text-2);font-size:10px;font-weight:600}.login-field>div{height:46px;display:flex;align-items:center;gap:9px;padding:0 12px;border:1px solid rgba(139,169,211,.16);border-radius:10px;background:rgba(8,13,23,.74);transition:border-color .18s,box-shadow .18s,background .18s}.login-field>div:focus-within{border-color:#66d9fb;box-shadow:0 0 0 3px rgba(77,198,239,.11);background:rgba(10,16,27,.94)}.login-field>div.invalid{border-color:rgba(255,102,125,.5)}.login-field div>svg{width:15px;height:15px;flex:0 0 auto;fill:none;stroke:#64738b;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}.login-field input{min-width:0;flex:1;color:var(--text-0);background:none;border:0;outline:0;font-size:12px}.login-field input::placeholder{color:#4f5c71}.password-toggle{width:28px;height:28px;display:grid;place-items:center;flex:0 0 auto;color:#687890;background:none;border:0;border-radius:7px;cursor:pointer}.password-toggle:hover{color:#b6c6dc;background:rgba(255,255,255,.04)}.password-toggle svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.remember-option{display:inline-block;margin:0 0 18px;cursor:pointer}.remember-option input{position:absolute;opacity:0;pointer-events:none}.remember-option>span{display:flex;align-items:center;gap:8px;color:#7c8aa0;font-size:10px}.remember-option i{width:16px;height:16px;display:grid;place-items:center;border:1px solid rgba(139,169,211,.22);border-radius:5px;background:rgba(9,14,24,.8);font-style:normal}.remember-option svg{width:11px;height:11px;fill:none;stroke:transparent;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.remember-option input:checked+span i{border-color:#62d5f7;background:linear-gradient(135deg,#58d7f7,#7184ff)}.remember-option input:checked+span svg{stroke:#071019}.login-error{display:flex;align-items:flex-start;gap:7px;margin:-6px 0 13px;padding:9px 10px;color:#ff96a7;border:1px solid rgba(255,98,122,.16);border-radius:8px;background:rgba(255,75,103,.06);font-size:9px;line-height:1.5}.login-error svg{width:13px;height:13px;flex:0 0 auto;margin-top:1px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}.submit-button{width:100%;height:45px;display:flex;align-items:center;justify-content:center;gap:9px;color:#061019;border:0;border-radius:10px;background:linear-gradient(135deg,#8beaff,#59cefb 42%,#7e86ff);box-shadow:0 13px 30px rgba(68,180,232,.19);cursor:pointer;font-size:11px;font-weight:800;letter-spacing:.02em;transition:transform .18s,box-shadow .18s,filter .18s}.submit-button:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 17px 38px rgba(68,180,232,.26)}.submit-button:disabled{opacity:.72;cursor:wait}.submit-button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.button-spinner{width:14px;height:14px;border:2px solid rgba(6,16,25,.25);border-top-color:#071019;border-radius:50%;animation:loginSpin .7s linear infinite}
.workspace-access-card{min-height:64px;margin-top:18px;padding:10px 12px;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;border:1px solid rgba(129,158,202,.12);border-radius:10px;background:rgba(7,11,19,.48)}.workspace-access-icon{width:34px;height:34px;display:grid;place-items:center;color:#8be7ff;border:1px solid rgba(91,205,240,.18);border-radius:9px;background:rgba(70,185,223,.08)}.workspace-access-icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.55;stroke-linecap:round;stroke-linejoin:round}.workspace-access-card>span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:2px}.workspace-access-card b{color:#b7c5d9;font-size:9px}.workspace-access-card small{color:#5e6c82;font-size:8px}.workspace-access-card em{color:#68cfe9;font:700 7px var(--font-mono);font-style:normal;letter-spacing:.09em}.account-help{margin:13px 0 0;color:#59677d;font-size:8px;line-height:1.55}.back-link{display:inline-flex;align-items:center;gap:5px;margin-top:16px;color:#7d8ba1;text-decoration:none;font-size:9px}.back-link:hover{color:#9feaff}.back-link svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.login-footer{width:min(1480px,calc(100% - 64px));height:52px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:2;color:#414e63;border-top:1px solid rgba(132,160,202,.08);font:600 7px var(--font-mono);letter-spacing:.1em}.login-footer span:last-child{letter-spacing:.16em}
@keyframes loginSpin{to{transform:rotate(360deg)}}
@media(max-width:1050px){.login-shell{grid-template-columns:minmax(0,1fr) 420px;gap:30px}.story-copy h1{font-size:45px}.release-card{right:28px;left:28px;min-width:0}.story-copy{left:38px;right:30px}.workflow-line b{display:none}}
@media(max-width:820px){.login-header{width:calc(100% - 32px);height:66px}.login-shell{width:calc(100% - 32px);min-height:0;padding:18px 0 24px;display:flex;flex-direction:column;gap:22px}.story-panel{min-height:230px;border-radius:18px}.story-copy{top:32px;left:28px}.story-copy h1{margin:15px 0 10px;font-size:34px}.story-copy p{max-width:450px;font-size:10px}.release-card{bottom:18px;right:18px;left:18px;padding:11px 13px}.release-metrics{margin-top:8px}.workflow-line{display:none}.access-panel{max-width:520px;padding:0}.login-footer{width:calc(100% - 32px)}}
@media(max-width:540px){.brand-words small{display:none}.brand-words b{font-size:14px}.story-panel{min-height:190px}.story-copy{top:24px;left:22px;right:18px}.story-eyebrow{font-size:7px}.story-copy h1{font-size:29px}.story-copy p{display:none}.release-card{bottom:13px;left:13px;right:13px}.release-top{margin-bottom:5px}.release-card>strong{font-size:12px}.release-metrics{display:none}.access-heading h2{font-size:27px}.workspace-access-card{grid-template-columns:34px 1fr}.workspace-access-card em{display:none}.login-footer{height:48px}.login-footer span:last-child{display:none}}
</style>
