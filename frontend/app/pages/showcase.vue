<template>
  <div class="showcase-page">
    <div class="backdrop-grid"></div>
    <div class="ambient ambient-a"></div>
    <div class="ambient ambient-b"></div>

    <div v-if="loading" class="page-state" aria-live="polite">
      <div class="loader"><span></span><span></span><span></span></div>
      <strong>{{ copy.loading }}</strong>
      <p>{{ copy.loadingHint }}</p>
    </div>

    <div v-else-if="loadError" class="page-state">
      <div class="state-icon">!</div>
      <strong>{{ copy.loadFailed }}</strong>
      <p>{{ loadError }}</p>
      <button class="primary-action" type="button" @click="load">{{ copy.retry }}</button>
    </div>

    <div v-else-if="!project" class="page-state">
      <div class="empty-cinema"><i></i><span></span><i></i></div>
      <strong>{{ copy.noProject }}</strong>
      <p>{{ copy.noProjectHint }}</p>
      <button class="primary-action" type="button" @click="navigateTo('/')">{{ copy.openProjects }}</button>
    </div>

    <main v-else class="showcase-shell">
      <section class="hero-section">
        <div class="hero-intro">
          <div class="hero-eyebrow">
            <span class="verified-dot"><i></i>{{ copy.realProject }}</span>
            <span class="case-number">CASE / {{ String(project.id).padStart(3, '0') }}</span>
          </div>
          <p class="brand-line">灵动 LINGDRAMA · AI SHORT DRAMA STUDIO</p>
          <h1>{{ copy.heroTitle }}</h1>
          <p class="hero-lead">{{ copy.heroLead }}</p>

          <div class="project-identity">
            <span>{{ copy.featuredWork }}</span>
            <strong>{{ project.title }}</strong>
            <div>
              <em v-if="project.genre">{{ project.genre }}</em>
              <em v-if="project.style">{{ project.style }}</em>
              <time>{{ formattedDate }}</time>
            </div>
          </div>

          <div class="hero-actions">
            <a v-if="masterVideo" class="primary-action" href="#master-film">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z"/></svg>
              {{ copy.watchFilm }}
            </a>
            <button class="secondary-action" type="button" @click="openWorkspace">
              {{ copy.enterWorkspace }}
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            </button>
          </div>
        </div>

        <div class="hero-frame">
          <video
            v-if="masterVideo"
            :src="masterVideo"
            :poster="projectPoster"
            muted
            loop
            autoplay
            playsinline
            preload="metadata"
          ></video>
          <img v-else-if="projectPoster" :src="projectPoster" :alt="project.title" />
          <div v-else class="frame-empty">
            <span class="frame-orbit"><i></i></span>
            <strong>{{ copy.visualPending }}</strong>
            <p>{{ copy.visualPendingHint }}</p>
          </div>
          <div class="frame-vignette"></div>
          <div class="frame-corners"><i></i><i></i><i></i><i></i></div>
          <div class="frame-top">
            <span>LINGDRAMA / PRODUCTIONS</span>
            <em v-if="hasFinalMaster"><i></i>{{ copy.masterReady }}</em>
          </div>
          <div class="frame-caption">
            <div>
              <span>{{ hasFinalMaster ? copy.finalMaster : copy.productionPreview }}</span>
              <strong>{{ featuredEpisodeTitle }}</strong>
            </div>
            <span class="runtime">{{ runtimeLabel }}</span>
          </div>
        </div>
      </section>

      <section class="evidence-strip" :aria-label="copy.projectEvidence">
        <div class="evidence-heading">
          <span>{{ copy.projectEvidence }}</span>
          <strong>{{ copy.dataFromProduction }}</strong>
        </div>
        <div v-for="metric in metrics" :key="metric.label" class="evidence-item">
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.label }}</span>
        </div>
      </section>

      <section id="master-film" class="master-section section-block">
        <div class="section-heading">
          <div>
            <span class="section-index">01 / {{ copy.result }}</span>
            <h2>{{ copy.masterTitle }}</h2>
            <p>{{ copy.masterDescription }}</p>
          </div>
          <div v-if="hasFinalMaster" class="delivery-seal">
            <i></i>
            <span>{{ copy.deliveryReady }}</span>
          </div>
        </div>

        <div v-if="masterVideo" class="master-stage">
          <video :src="masterVideo" :poster="projectPoster" controls playsinline preload="metadata"></video>
          <div class="master-meta">
            <div>
              <span>{{ copy.work }}</span>
              <strong>{{ project.title }}</strong>
            </div>
            <div>
              <span>{{ copy.episode }}</span>
              <strong>{{ featuredEpisodeTitle }}</strong>
            </div>
            <div>
              <span>{{ copy.duration }}</span>
              <strong>{{ runtimeLabel }}</strong>
            </div>
            <div>
              <span>{{ copy.deliveryFormat }}</span>
              <strong>MP4 · HD</strong>
            </div>
          </div>
        </div>
        <div v-else class="master-empty">
          <div><span></span></div>
          <strong>{{ copy.noMaster }}</strong>
          <p>{{ copy.noMasterHint }}</p>
        </div>
      </section>

      <section class="sequence-section section-block">
        <div class="section-heading">
          <div>
            <span class="section-index">02 / {{ copy.visualSequence }}</span>
            <h2>{{ copy.sequenceTitle }}</h2>
            <p>{{ copy.sequenceDescription }}</p>
          </div>
          <span v-if="visualShots.length" class="sequence-count">{{ visualShots.length }} / {{ shotCount }} {{ copy.shots }}</span>
        </div>

        <div v-if="visualShots.length" class="sequence-grid" :class="`count-${visualShots.length}`">
          <article v-for="(shot, index) in visualShots" :key="shot.id" class="shot-card">
            <div class="shot-media">
              <img :src="shotImage(shot)" :alt="shot.title || `${copy.shot} ${index + 1}`" loading="lazy" />
              <div class="shot-shade"></div>
              <span class="shot-number">SHOT {{ String(shot.storyboard_number || shot.storyboardNumber || index + 1).padStart(2, '0') }}</span>
              <span v-if="shot.video_url || shot.videoUrl || shot.composed_video_url || shot.composedVideoUrl" class="motion-ready"><i></i>{{ copy.motionReady }}</span>
            </div>
            <div class="shot-copy">
              <div>
                <strong>{{ shot.title || `${copy.shot} ${index + 1}` }}</strong>
                <span>{{ [shot.shot_type || shot.shotType, shot.movement].filter(Boolean).join(' · ') }}</span>
              </div>
              <time>{{ formatDuration(shot.duration || 0) }}</time>
            </div>
          </article>
        </div>
        <div v-else class="sequence-empty">
          <div><i></i><i></i><i></i></div>
          <strong>{{ copy.noSequence }}</strong>
          <p>{{ copy.noSequenceHint }}</p>
        </div>
      </section>

      <section class="capability-section section-block">
        <div class="section-heading centered-heading">
          <div>
            <span class="section-index">03 / {{ copy.productionSystem }}</span>
            <h2>{{ copy.pipelineTitle }}</h2>
            <p>{{ copy.pipelineDescription }}</p>
          </div>
        </div>

        <div class="pipeline-line" aria-hidden="true"><span :style="{ width: `${verifiedCapabilityProgress}%` }"></span></div>
        <div class="capability-grid">
          <article v-for="(item, index) in capabilities" :key="item.title" :class="{ verified: item.verified }">
            <div class="capability-top">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <i><b></b></i>
            </div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.description }}</p>
            <em>{{ item.verified ? copy.verifiedInProject : copy.availableInWorkspace }}</em>
          </article>
        </div>
      </section>

      <section class="world-section section-block">
        <div class="world-copy">
          <span class="section-index">04 / {{ copy.productionWorld }}</span>
          <h2>{{ copy.worldTitle }}</h2>
          <p>{{ copy.worldDescription }}</p>
          <button class="secondary-action" type="button" @click="openWorkspace">
            {{ copy.exploreProject }}
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
          </button>
        </div>
        <div class="world-data">
          <div class="world-column">
            <span>{{ copy.characters }}</span>
            <div v-if="characters.length" class="name-list">
              <div v-for="character in characters.slice(0, 4)" :key="character.id">
                <i>{{ initials(character.name) }}</i>
                <span><strong>{{ character.name }}</strong><small>{{ character.role || copy.characterAsset }}</small></span>
              </div>
            </div>
            <p v-else>{{ copy.noCharacters }}</p>
          </div>
          <div class="world-column">
            <span>{{ copy.scenes }}</span>
            <div v-if="scenes.length" class="scene-list">
              <div v-for="scene in scenes.slice(0, 4)" :key="scene.id">
                <strong>{{ scene.location || copy.unnamedScene }}</strong>
                <small>{{ scene.time || copy.sceneAsset }}</small>
              </div>
            </div>
            <p v-else>{{ copy.noScenes }}</p>
          </div>
        </div>
      </section>

      <section class="closing-section">
        <div class="closing-glow"></div>
        <span>LINGDRAMA · STORY TO SCREEN</span>
        <h2>{{ copy.closingTitle }}</h2>
        <p>{{ copy.closingDescription }}</p>
        <button class="primary-action closing-action" type="button" @click="openWorkspace">
          {{ copy.enterWorkspace }}
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
        </button>
      </section>

      <footer class="showcase-footer">
        <span>© {{ new Date().getFullYear() }} 灵动 LingDrama</span>
        <span>{{ copy.footerLine }}</span>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { dramaAPI, episodeAPI, mergeAPI } from '~/composables/useApi'

const { locale } = useLingLocale()
const loading = ref(true)
const loadError = ref('')
const project = ref(null)
const episodeData = ref({})

const messages = {
  'zh-CN': {
    loading: '正在载入作品', loadingHint: '同步项目、镜头与交付数据…', loadFailed: '作品数据暂时无法载入', retry: '重新载入', noProject: '暂无作品', noProjectHint: '完成首个项目后，作品将自动呈现在这里。', openProjects: '打开项目中心',
    realProject: '精选作品', heroTitle: '从一段故事，\n到一部可以播放的短剧。', heroLead: 'LingDrama 将剧本、角色、场景、分镜与动态影像连接成一条完整的 AI 短剧生产链，让创作与交付始终保持在同一个项目上下文中。', featuredWork: 'FEATURED PRODUCTION', watchFilm: '观看完整成片', enterWorkspace: '进入制作空间', visualPending: '等待首个画面', visualPendingHint: '项目产生视觉资产后，这里会自动更新。', masterReady: '成片已就绪', finalMaster: 'FINAL MASTER', productionPreview: 'PRODUCTION PREVIEW',
    projectEvidence: 'PRODUCTION OVERVIEW', dataFromProduction: '项目生产数据', episodes: '剧集', characters: '角色', scenes: '场景', shots: '分镜', runtime: '成片时长', masters: '交付成片',
    result: '成片交付', masterTitle: '当前项目最终成片', masterDescription: '播放器呈现当前项目的最终交付版本，可直接审看画面、节奏与成片质量。', deliveryReady: 'DELIVERY READY', work: '项目', episode: '剧集', duration: '时长', deliveryFormat: '交付格式', noMaster: '这个项目尚未生成最终成片', noMasterHint: '分镜视频完成合成后，交付文件会显示在这里。',
    visualSequence: '视觉序列', sequenceTitle: '镜头之间，保持同一个故事世界', sequenceDescription: '从当前项目中抽取的关键帧，呈现叙事节奏、人物关系与场景连续性。', shot: '镜头', motionReady: '动态镜头', noSequence: '尚无可用的镜头序列', noSequenceHint: '完成分镜画面生成后，这里会按镜头顺序呈现。',
    productionSystem: '生产系统', pipelineTitle: 'AI 短剧全流程能力', pipelineDescription: '从文字理解到最终交付，将复杂制作过程组织为清晰、可追踪的生产阶段。', verifiedInProject: '已完成', availableInWorkspace: '待启动',
    capabilities: [
      ['剧本结构化', '理解故事、整理情节并形成可制作的剧本结构。'],
      ['角色与场景', '提取人物设定、关系与场景世界观，沉淀为项目资产。'],
      ['导演式分镜', '拆解景别、运镜、动作、对白与镜头时长。'],
      ['视觉关键帧', '根据分镜生成可用于动态制作的视觉关键帧。'],
      ['动态镜头', '将关键画面与导演提示转化为连续视频镜头。'],
      ['合成与交付', '完成字幕、镜头合成、整集拼接与成片输出。'],
    ],
    productionWorld: '项目世界', worldTitle: '角色、场景与故事，共享一套制作上下文', worldDescription: '每个项目都有自己的创作世界。角色与场景不是散落的提示词，而是能够在剧集和镜头之间复用的生产资产。', exploreProject: '查看项目全貌', characterAsset: '角色资产', sceneAsset: '场景资产', unnamedScene: '未命名场景', noCharacters: '项目尚未提取角色。', noScenes: '项目尚未提取场景。',
    closingTitle: '灵感无需停留在想象里。', closingDescription: '灵动 LingDrama，让短剧生产从第一行文字一直走到最后一帧影像。', footerLine: 'AI SHORT DRAMA PRODUCTION STUDIO',
  },
  'en-US': {
    loading: 'Loading productions', loadingHint: 'Syncing projects, shots, and deliverables…', loadFailed: 'Production data is temporarily unavailable', retry: 'Reload', noProject: 'No productions yet', noProjectHint: 'Completed work will appear here after the first project is created.', openProjects: 'Open project center',
    realProject: 'FEATURED PRODUCTION', heroTitle: 'From a single story\nto a drama you can watch.', heroLead: 'LingDrama connects scripts, characters, scenes, storyboards, and motion into one complete AI drama production line, keeping creation and delivery in a single project context.', featuredWork: 'FEATURED PRODUCTION', watchFilm: 'Watch the full film', enterWorkspace: 'Enter production space', visualPending: 'Waiting for the first visual', visualPendingHint: 'This view updates automatically when the project creates visual assets.', masterReady: 'Master ready', finalMaster: 'FINAL MASTER', productionPreview: 'PRODUCTION PREVIEW',
    projectEvidence: 'PRODUCTION OVERVIEW', dataFromProduction: 'Project production data', episodes: 'Episodes', characters: 'Characters', scenes: 'Scenes', shots: 'Shots', runtime: 'Master runtime', masters: 'Masters',
    result: 'FINAL DELIVERY', masterTitle: 'Current project final master', masterDescription: 'Review the current final master directly in the player, including picture, pacing, and delivery quality.', deliveryReady: 'DELIVERY READY', work: 'Project', episode: 'Episode', duration: 'Runtime', deliveryFormat: 'Format', noMaster: 'This project has no final master yet', noMasterHint: 'The delivery file will appear here after shot composition and episode assembly.',
    visualSequence: 'VISUAL SEQUENCE', sequenceTitle: 'One story world, carried across every shot', sequenceDescription: 'Keyframes from the current project reveal narrative rhythm, character relationships, and visual continuity.', shot: 'Shot', motionReady: 'Motion ready', noSequence: 'No visual sequence is available yet', noSequenceHint: 'Frames will appear in story order after storyboard image generation.',
    productionSystem: 'PRODUCTION SYSTEM', pipelineTitle: 'The complete AI drama workflow', pipelineDescription: 'From story understanding to final delivery, complex production becomes a clear and traceable sequence.', verifiedInProject: 'Completed', availableInWorkspace: 'Ready to start',
    capabilities: [
      ['Script structure', 'Understand the story, organize the plot and form a production-ready script.'],
      ['Characters & scenes', 'Extract characters, relationships and the visual world into reusable assets.'],
      ['Director storyboards', 'Define framing, movement, action, dialogue and shot duration.'],
      ['Visual keyframes', 'Generate motion-ready visual keyframes from each shot.'],
      ['Motion shots', 'Turn key visuals and direction into continuous video shots.'],
      ['Compose & deliver', 'Complete subtitles, shot composition, episode assembly and export.'],
    ],
    productionWorld: 'PROJECT WORLD', worldTitle: 'Characters, scenes and story share one production context', worldDescription: 'Every project has its own creative world. Characters and scenes become reusable production assets across episodes and shots—not isolated prompts.', exploreProject: 'Explore the project', characterAsset: 'Character asset', sceneAsset: 'Scene asset', unnamedScene: 'Untitled scene', noCharacters: 'No characters have been extracted yet.', noScenes: 'No scenes have been extracted yet.',
    closingTitle: 'Ideas should not remain imaginary.', closingDescription: 'LingDrama carries short-drama production from the first line of text to the final frame.', footerLine: 'AI SHORT DRAMA PRODUCTION STUDIO',
  },
}

const copy = computed(() => messages[locale.value] || messages['zh-CN'])
const episodes = computed(() => project.value?.episodes || [])
const characters = computed(() => project.value?.characters || [])
const scenes = computed(() => project.value?.scenes || [])
const details = epId => episodeData.value[epId] || { storyboards: [], merge: null }
const storyboards = computed(() => {
  const rows = episodes.value.flatMap(ep => (details(ep.id).storyboards || []).map(shot => ({ ...shot, episode: ep })))
  if (rows.length) return rows
  return (project.value?.storyboards || []).map(shot => ({
    ...shot,
    episode: episodes.value.find(ep => Number(ep.id) === Number(shot.episode_id || shot.episodeId)) || episodes.value[0],
  })).filter(shot => shot.episode)
})
const completedMerges = computed(() => episodes.value.map(ep => ({ episode: ep, merge: details(ep.id).merge })).filter(item => item.merge?.status === 'completed' && item.merge?.merged_url))
const featuredDelivery = computed(() => completedMerges.value[completedMerges.value.length - 1] || null)
const masterVideo = computed(() => mediaUrl(featuredDelivery.value?.merge?.merged_url || project.value?.preview_video))
const projectPoster = computed(() => mediaUrl(project.value?.preview_image) || [...storyboards.value].reverse().map(shotImage).find(Boolean) || '')
const hasFinalMaster = computed(() => Boolean(featuredDelivery.value || project.value?.production_summary?.final_ready))
const featuredEpisodeTitle = computed(() => featuredDelivery.value?.episode?.title || episodes.value[episodes.value.length - 1]?.title || copy.value.productionPreview)
const totalRuntime = computed(() => {
  const mergedDuration = completedMerges.value.reduce((sum, item) => sum + Number(item.merge.duration || 0), 0)
  if (mergedDuration) return mergedDuration
  return storyboards.value.reduce((sum, shot) => sum + Number(shot.duration || 0), 0)
})
const runtimeLabel = computed(() => formatDuration(totalRuntime.value))
const shotCount = computed(() => Number(project.value?.production_summary?.shots ?? storyboards.value.length))
const imagesReady = computed(() => Number(project.value?.production_summary?.images_ready ?? storyboards.value.filter(shot => Boolean(shotImage(shot))).length))
const videosReady = computed(() => Number(project.value?.production_summary?.videos_ready ?? storyboards.value.filter(shot => shot.video_url || shot.videoUrl || shot.composed_video_url || shot.composedVideoUrl).length))
const visualShots = computed(() => storyboards.value.filter(shot => shotImage(shot)).slice(0, 3))
const formattedDate = computed(() => formatDate(project.value?.updated_at || project.value?.updatedAt))
const metrics = computed(() => [
  { value: episodes.value.length, label: copy.value.episodes },
  { value: characters.value.length, label: copy.value.characters },
  { value: scenes.value.length, label: copy.value.scenes },
  { value: shotCount.value, label: copy.value.shots },
  { value: runtimeLabel.value, label: copy.value.runtime },
  { value: completedMerges.value.length || (hasFinalMaster.value ? 1 : 0), label: copy.value.masters },
])
const capabilities = computed(() => copy.value.capabilities.map(([title, description], index) => ({
  title,
  description,
  verified: [
    episodes.value.some(ep => ep.script_content || ep.scriptContent),
    characters.value.length > 0 && scenes.value.length > 0,
    shotCount.value > 0,
    imagesReady.value > 0,
    videosReady.value > 0,
    hasFinalMaster.value,
  ][index],
})))
const verifiedCapabilityProgress = computed(() => Math.round(capabilities.value.filter(item => item.verified).length / capabilities.value.length * 100))

function mediaUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}
function shotImage(shot) {
  return mediaUrl(shot?.composed_image || shot?.composedImage || shot?.first_frame_image || shot?.firstFrameImage || shot?.last_frame_image || shot?.lastFrameImage)
}
function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0))
  if (value < 60) return `${value}s`
  const mins = Math.floor(value / 60)
  const secs = value % 60
  return secs ? `${mins}m ${secs}s` : `${mins}m`
}
function formatDate(value) {
  if (!value) return ''
  try { return new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value)) } catch { return '' }
}
function initials(name) { return String(name || 'LD').trim().slice(0, 2).toUpperCase() }
function openWorkspace() { navigateTo(`/drama/${project.value.id}`) }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const response = await dramaAPI.list()
    const projects = Array.isArray(response) ? response : (response?.items || [])
    const candidate = projects.find(item => item.production_summary?.final_ready || item.preview_video)
      || projects.find(item => Number(item.production_summary?.shots || 0) > 0)
      || projects[0]
    if (!candidate) {
      project.value = null
      return
    }

    const detail = await dramaAPI.get(candidate.id)
    project.value = detail
    const rows = await Promise.all((detail.episodes || []).map(async episode => {
      const [episodeStoryboards, merge] = await Promise.all([
        episodeAPI.storyboards(episode.id).catch(() => []),
        mergeAPI.status(episode.id).catch(() => null),
      ])
      return [episode.id, { storyboards: episodeStoryboards || [], merge }]
    }))
    episodeData.value = Object.fromEntries(rows)
  } catch (error) {
    loadError.value = error?.message || copy.value.loadFailed
    project.value = null
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.showcase-page {
  --showcase-ink: #f2f6ff;
  --showcase-muted: #8a97b1;
  --showcase-dim: #5d6a82;
  --showcase-line: rgba(139, 163, 205, .14);
  --showcase-panel: rgba(15, 22, 37, .82);
  --showcase-cyan: #58d9ff;
  --showcase-blue: #6485ff;
  --showcase-violet: #9676ff;
  --showcase-green: #55e2ad;
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  color: var(--showcase-ink);
  background: linear-gradient(180deg, #080d17 0%, #0a101d 42%, #070b14 100%);
  scroll-behavior: smooth;
}
.backdrop-grid { position: absolute; inset: 0 0 auto; height: 900px; opacity: .22; pointer-events: none; background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(black, transparent); }
.ambient { position: absolute; border-radius: 50%; filter: blur(28px); pointer-events: none; }.ambient-a { width: 520px; height: 520px; top: -330px; left: 4%; background: rgba(56,112,245,.2); }.ambient-b { width: 460px; height: 460px; top: 180px; right: -300px; background: rgba(132,70,255,.15); }
.showcase-shell { width: min(1440px, calc(100% - clamp(32px, 7vw, 108px))); margin: 0 auto; padding: 48px 0 28px; position: relative; z-index: 1; }
.hero-section { min-height: 600px; display: grid; grid-template-columns: minmax(0, .84fr) minmax(540px, 1.16fr); gap: clamp(38px, 5vw, 82px); align-items: center; }
.hero-intro { padding: 38px 0; }.hero-eyebrow { display: flex; align-items: center; gap: 12px; }.verified-dot, .case-number { height: 26px; display: inline-flex; align-items: center; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: .09em; }.verified-dot { padding: 0 10px; color: #9bf1cf; border: 1px solid rgba(85,226,173,.18); background: rgba(85,226,173,.07); }.verified-dot i { width: 5px; height: 5px; margin-right: 6px; border-radius: 50%; background: var(--showcase-green); box-shadow: 0 0 10px var(--showcase-green); }.case-number { color: var(--showcase-dim); }
.brand-line { margin: 30px 0 10px; color: var(--showcase-cyan); font-size: 9px; font-weight: 700; letter-spacing: .22em; }.hero-intro h1 { white-space: pre-line; margin: 0; font-size: clamp(46px, 5vw, 76px); line-height: 1.08; letter-spacing: -.055em; text-wrap: balance; }.hero-lead { max-width: 650px; margin: 23px 0 0; color: #929eb6; font-size: 14px; line-height: 1.9; }
.project-identity { margin-top: 33px; padding: 18px 0 18px 18px; border-left: 2px solid transparent; border-image: linear-gradient(var(--showcase-cyan), var(--showcase-violet)) 1; display: flex; flex-direction: column; gap: 6px; }.project-identity > span { color: var(--showcase-dim); font-size: 8px; letter-spacing: .16em; }.project-identity > strong { font-size: 15px; }.project-identity > div { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }.project-identity em { padding: 3px 7px; border-radius: 5px; color: #91a1bd; background: rgba(255,255,255,.035); font-size: 8px; font-style: normal; }.project-identity time { color: var(--showcase-dim); font-size: 8px; }
.hero-actions { display: flex; gap: 10px; margin-top: 29px; }.primary-action, .secondary-action { min-height: 45px; display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 0 19px; border-radius: 11px; border: 0; color: white; font: inherit; font-size: 11px; font-weight: 700; text-decoration: none; cursor: pointer; transition: .22s ease; }.primary-action { background: linear-gradient(115deg, #547cf5, #765ce5); box-shadow: 0 12px 30px rgba(79,94,220,.25), inset 0 1px rgba(255,255,255,.2); }.secondary-action { color: #bdc9df; background: rgba(255,255,255,.025); border: 1px solid var(--showcase-line); }.primary-action:hover, .secondary-action:hover { transform: translateY(-2px); }.secondary-action:hover { color: white; border-color: rgba(88,217,255,.3); }.primary-action svg, .secondary-action svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }.primary-action svg path:first-child { fill: currentColor; stroke: none; }
.hero-frame { position: relative; overflow: hidden; aspect-ratio: 16/10.5; border-radius: 26px; background: #050912; border: 1px solid rgba(146,170,215,.18); box-shadow: 0 34px 90px rgba(0,0,0,.4), 0 0 70px rgba(74,99,198,.08); }.hero-frame::before { content: ''; position: absolute; inset: -1px; border-radius: inherit; z-index: 3; pointer-events: none; box-shadow: inset 0 1px rgba(255,255,255,.07); }.hero-frame > video, .hero-frame > img { width: 100%; height: 100%; object-fit: cover; }.frame-vignette { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(3,6,12,.46), transparent 35%, rgba(3,7,14,.86)); pointer-events: none; }.frame-corners i { width: 18px; height: 18px; position: absolute; z-index: 2; border-color: rgba(177,223,255,.42); border-style: solid; }.frame-corners i:nth-child(1) { left: 17px; top: 17px; border-width: 1px 0 0 1px; }.frame-corners i:nth-child(2) { right: 17px; top: 17px; border-width: 1px 1px 0 0; }.frame-corners i:nth-child(3) { right: 17px; bottom: 17px; border-width: 0 1px 1px 0; }.frame-corners i:nth-child(4) { left: 17px; bottom: 17px; border-width: 0 0 1px 1px; }.frame-top, .frame-caption { position: absolute; left: 30px; right: 30px; z-index: 2; display: flex; align-items: center; justify-content: space-between; }.frame-top { top: 27px; color: rgba(255,255,255,.6); font-size: 8px; letter-spacing: .18em; }.frame-top em { padding: 6px 8px; color: #a1efd3; border-radius: 7px; background: rgba(6,26,23,.66); backdrop-filter: blur(8px); font-size: 7px; font-style: normal; letter-spacing: .07em; }.frame-top em i { display: inline-block; width: 4px; height: 4px; margin-right: 5px; border-radius: 50%; background: var(--showcase-green); box-shadow: 0 0 7px var(--showcase-green); }.frame-caption { bottom: 29px; }.frame-caption > div { min-width: 0; display: flex; flex-direction: column; gap: 5px; }.frame-caption span { color: rgba(255,255,255,.55); font-size: 8px; letter-spacing: .12em; }.frame-caption strong { max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; }.frame-caption .runtime { padding: 6px 9px; border-radius: 7px; color: white; background: rgba(5,9,17,.62); backdrop-filter: blur(7px); font: 700 10px ui-monospace, monospace; }.frame-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #92a0b9; background: radial-gradient(circle at center, rgba(74,111,207,.17), transparent 46%); }.frame-empty p { max-width: 280px; margin: 7px 0 0; color: var(--showcase-dim); font-size: 10px; }.frame-orbit { width: 70px; height: 70px; margin-bottom: 18px; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(88,217,255,.2); box-shadow: 0 0 50px rgba(88,217,255,.06); }.frame-orbit i { width: 0; height: 0; margin-left: 4px; border-top: 7px solid transparent; border-bottom: 7px solid transparent; border-left: 11px solid #77dfff; }
.evidence-strip { min-height: 108px; margin-top: 18px; padding: 0 27px; display: grid; grid-template-columns: minmax(190px, 1.35fr) repeat(6, minmax(76px, .6fr)); align-items: center; border: 1px solid var(--showcase-line); border-radius: 18px; background: rgba(15,22,37,.68); backdrop-filter: blur(10px); }.evidence-heading { display: flex; flex-direction: column; gap: 6px; }.evidence-heading span { color: var(--showcase-blue); font-size: 8px; font-weight: 700; letter-spacing: .17em; }.evidence-heading strong { font-size: 10px; color: #a5b1c8; }.evidence-item { min-height: 48px; padding-left: 22px; border-left: 1px solid var(--showcase-line); display: flex; flex-direction: column; justify-content: center; gap: 5px; }.evidence-item strong { font-size: 19px; letter-spacing: -.02em; }.evidence-item span { color: var(--showcase-dim); font-size: 8px; text-transform: uppercase; letter-spacing: .06em; }
.section-block { margin-top: 96px; }.section-heading { margin-bottom: 28px; display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; }.section-heading h2 { margin: 7px 0 0; font-size: clamp(27px, 3vw, 41px); letter-spacing: -.04em; }.section-heading p { max-width: 700px; margin: 12px 0 0; color: var(--showcase-muted); font-size: 12px; line-height: 1.75; }.section-index { color: var(--showcase-blue); font-size: 8px; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
.delivery-seal { display: flex; align-items: center; gap: 8px; padding: 8px 11px; border-radius: 8px; color: #a5f1d5; border: 1px solid rgba(85,226,173,.15); background: rgba(85,226,173,.05); font-size: 8px; font-weight: 700; letter-spacing: .08em; }.delivery-seal i { width: 6px; height: 6px; border-radius: 50%; background: var(--showcase-green); box-shadow: 0 0 9px var(--showcase-green); }
.master-stage { padding: 16px; border-radius: 24px; border: 1px solid var(--showcase-line); background: linear-gradient(145deg, rgba(17,25,42,.95), rgba(10,15,26,.9)); box-shadow: 0 28px 80px rgba(0,0,0,.24); }.master-stage video { width: 100%; aspect-ratio: 16/9; display: block; object-fit: contain; border-radius: 14px; background: #020408; }.master-meta { display: grid; grid-template-columns: 1.5fr 1.2fr .5fr .7fr; gap: 20px; padding: 18px 10px 4px; }.master-meta > div { min-width: 0; display: flex; flex-direction: column; gap: 5px; }.master-meta span { color: var(--showcase-dim); font-size: 7px; letter-spacing: .1em; text-transform: uppercase; }.master-meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #bbc6db; font-size: 10px; }
.master-empty, .sequence-empty { min-height: 360px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px dashed rgba(134,159,210,.17); border-radius: 20px; background: rgba(255,255,255,.012); }.master-empty > div { width: 74px; height: 48px; margin-bottom: 18px; display: grid; place-items: center; border: 1px solid rgba(114,147,213,.2); border-radius: 10px; }.master-empty > div span { width: 0; height: 0; border-top: 6px solid transparent; border-bottom: 6px solid transparent; border-left: 10px solid #657594; }.master-empty p, .sequence-empty p { max-width: 360px; margin: 7px 0 0; color: var(--showcase-dim); font-size: 10px; }
.sequence-count { color: var(--showcase-dim); font: 600 9px ui-monospace, monospace; }.sequence-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 14px; }.sequence-grid.count-1 { grid-template-columns: minmax(0, .65fr); }.sequence-grid.count-2 { grid-template-columns: repeat(2, minmax(0, .75fr)); }.shot-card { overflow: hidden; border: 1px solid var(--showcase-line); border-radius: 17px; background: var(--showcase-panel); transition: .24s ease; }.shot-card:hover { transform: translateY(-3px); border-color: rgba(88,217,255,.28); box-shadow: 0 18px 50px rgba(0,0,0,.2); }.shot-media { aspect-ratio: 16/10; overflow: hidden; position: relative; background: #050912; }.shot-media img { width: 100%; height: 100%; object-fit: cover; transition: transform .55s ease; }.shot-card:hover img { transform: scale(1.035); }.shot-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(2,5,10,.25), transparent 58%, rgba(2,5,10,.58)); }.shot-number, .motion-ready { position: absolute; top: 11px; z-index: 2; padding: 5px 7px; border-radius: 6px; backdrop-filter: blur(8px); font-size: 7px; font-weight: 700; letter-spacing: .08em; }.shot-number { left: 11px; color: #d7e0f1; background: rgba(4,8,15,.62); }.motion-ready { right: 11px; color: #a0efd2; background: rgba(4,24,21,.64); }.motion-ready i { display: inline-block; width: 4px; height: 4px; margin-right: 4px; border-radius: 50%; background: var(--showcase-green); }.shot-copy { min-height: 65px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; }.shot-copy > div { min-width: 0; display: flex; flex-direction: column; gap: 5px; }.shot-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }.shot-copy span, .shot-copy time { color: var(--showcase-dim); font-size: 8px; }.shot-copy time { flex: 0 0 auto; font-family: ui-monospace, monospace; }
.sequence-empty { min-height: 260px; }.sequence-empty > div { display: flex; gap: 7px; margin-bottom: 18px; }.sequence-empty i { width: 42px; height: 27px; display: block; border-radius: 5px; border: 1px solid rgba(113,144,203,.17); background: rgba(72,102,164,.04); }.sequence-empty i:nth-child(1) { transform: rotate(-5deg); }.sequence-empty i:nth-child(3) { transform: rotate(5deg); }
.centered-heading { justify-content: center; text-align: center; }.centered-heading p { margin-left: auto; margin-right: auto; }.pipeline-line { width: min(830px, 74%); height: 2px; margin: 0 auto -27px; background: rgba(255,255,255,.05); }.pipeline-line span { display: block; height: 100%; background: linear-gradient(90deg, var(--showcase-cyan), var(--showcase-blue), var(--showcase-violet)); box-shadow: 0 0 12px rgba(88,217,255,.3); }.capability-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 10px; position: relative; }.capability-grid article { min-height: 210px; padding: 20px 16px; display: flex; flex-direction: column; border: 1px solid var(--showcase-line); border-radius: 15px; background: linear-gradient(155deg, rgba(18,26,43,.88), rgba(10,15,26,.8)); }.capability-grid article.verified { border-color: rgba(95,153,255,.18); }.capability-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 27px; }.capability-top > span { color: #586681; font: 700 8px ui-monospace, monospace; }.capability-top > i { width: 10px; height: 10px; display: grid; place-items: center; border-radius: 50%; background: #394257; box-shadow: 0 0 0 5px #111827; }.verified .capability-top > i { background: var(--showcase-cyan); box-shadow: 0 0 0 5px #111827, 0 0 14px rgba(88,217,255,.55); }.capability-grid article > strong { font-size: 12px; }.capability-grid article > p { flex: 1; margin: 10px 0 16px; color: var(--showcase-dim); font-size: 9px; line-height: 1.65; }.capability-grid article > em { color: #62708a; font-size: 7px; font-style: normal; }.capability-grid article.verified > em { color: #79cdb7; }
.world-section { min-height: 400px; padding: clamp(28px, 4vw, 55px); display: grid; grid-template-columns: .8fr 1.2fr; gap: 70px; align-items: center; overflow: hidden; position: relative; border: 1px solid var(--showcase-line); border-radius: 25px; background: radial-gradient(circle at 8% 20%, rgba(66,116,228,.15), transparent 38%), linear-gradient(145deg, rgba(17,25,42,.93), rgba(10,15,26,.88)); }.world-section::after { content: ''; position: absolute; width: 360px; height: 360px; right: -190px; bottom: -260px; border-radius: 50%; border: 1px solid rgba(113,104,243,.2); box-shadow: 0 0 0 45px rgba(113,104,243,.025), 0 0 0 90px rgba(113,104,243,.018); }.world-copy { position: relative; z-index: 1; }.world-copy h2 { margin: 10px 0 0; font-size: clamp(27px,3vw,42px); line-height: 1.12; letter-spacing: -.04em; }.world-copy p { margin: 17px 0 24px; color: var(--showcase-muted); font-size: 11px; line-height: 1.8; }.world-data { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; position: relative; z-index: 1; }.world-column { min-height: 260px; padding: 19px; border: 1px solid rgba(137,162,207,.11); border-radius: 16px; background: rgba(5,10,19,.32); }.world-column > span { color: var(--showcase-blue); font-size: 8px; font-weight: 700; letter-spacing: .13em; text-transform: uppercase; }.world-column > p { color: var(--showcase-dim); font-size: 9px; }.name-list, .scene-list { display: flex; flex-direction: column; margin-top: 14px; }.name-list > div, .scene-list > div { min-height: 48px; display: flex; align-items: center; gap: 10px; border-top: 1px solid rgba(139,163,205,.08); }.name-list i { width: 28px; height: 28px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 9px; color: #a9bae0; background: rgba(93,125,211,.12); font-size: 8px; font-style: normal; font-weight: 700; }.name-list span { min-width: 0; display: flex; flex-direction: column; gap: 4px; }.name-list strong, .scene-list strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 9px; }.name-list small, .scene-list small { color: var(--showcase-dim); font-size: 7px; }.scene-list > div { align-items: flex-start; justify-content: center; flex-direction: column; gap: 4px; }
.closing-section { min-height: 370px; margin-top: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden; border-top: 1px solid var(--showcase-line); border-bottom: 1px solid var(--showcase-line); }.closing-glow { width: 450px; height: 240px; position: absolute; top: 36%; left: 50%; transform: translate(-50%,-50%); border-radius: 50%; background: rgba(74,98,228,.16); filter: blur(60px); pointer-events: none; }.closing-section > span { position: relative; color: var(--showcase-cyan); font-size: 8px; font-weight: 700; letter-spacing: .2em; }.closing-section h2 { position: relative; margin: 17px 0 0; font-size: clamp(34px,4vw,58px); letter-spacing: -.045em; }.closing-section p { position: relative; margin: 13px 0 24px; color: var(--showcase-muted); font-size: 12px; }.closing-action { position: relative; }.showcase-footer { min-height: 80px; display: flex; justify-content: space-between; align-items: center; color: #4e5b71; font-size: 8px; letter-spacing: .07em; }
.page-state { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--showcase-ink); }.page-state > p { max-width: 420px; margin: 8px 0 20px; color: var(--showcase-dim); font-size: 11px; line-height: 1.65; }.loader { height: 45px; display: flex; align-items: end; gap: 6px; margin-bottom: 18px; }.loader span { width: 7px; border-radius: 6px; background: linear-gradient(var(--showcase-cyan), var(--showcase-blue)); animation: pulse 1s ease-in-out infinite alternate; }.loader span:nth-child(1) { height: 22px; }.loader span:nth-child(2) { height: 38px; animation-delay: .15s; }.loader span:nth-child(3) { height: 29px; animation-delay: .3s; }.state-icon { width: 48px; height: 48px; margin-bottom: 16px; display: grid; place-items: center; border-radius: 50%; color: #ff98a7; border: 1px solid rgba(255,112,132,.2); background: rgba(255,112,132,.05); font-weight: 800; }.empty-cinema { height: 52px; margin-bottom: 18px; display: flex; align-items: center; gap: 6px; }.empty-cinema i { width: 34px; height: 25px; border-radius: 5px; border: 1px solid rgba(126,154,211,.18); transform: rotate(-5deg); }.empty-cinema i:last-child { transform: rotate(5deg); }.empty-cinema span { width: 44px; height: 34px; border-radius: 6px; border: 1px solid rgba(88,217,255,.25); }
@keyframes pulse { to { transform: scaleY(.55); opacity: .55; } }
@media (max-width: 1180px) {
  .hero-section { grid-template-columns: .9fr 1.1fr; gap: 38px; }.hero-intro h1 { font-size: 51px; }.evidence-strip { grid-template-columns: repeat(6,1fr); padding: 18px; }.evidence-heading { grid-column: 1/-1; padding-bottom: 15px; border-bottom: 1px solid var(--showcase-line); }.evidence-item { padding-left: 14px; }.capability-grid { grid-template-columns: repeat(3,1fr); }.pipeline-line { display: none; }.capability-grid article { min-height: 185px; }
}
@media (max-width: 860px) {
  .showcase-shell { width: calc(100% - 30px); padding-top: 20px; }.hero-section { grid-template-columns: 1fr; gap: 14px; }.hero-intro { padding-bottom: 15px; }.hero-frame { min-height: 380px; }.section-block { margin-top: 72px; }.world-section { grid-template-columns: 1fr; gap: 35px; }.sequence-grid, .sequence-grid.count-1, .sequence-grid.count-2 { grid-template-columns: 1fr 1fr; }.master-meta { grid-template-columns: 1fr 1fr; }.master-stage { padding: 10px; }
}
@media (max-width: 600px) {
  .hero-intro h1 { font-size: 40px; }.hero-lead { font-size: 12px; }.hero-actions { flex-direction: column; }.hero-frame { min-height: 280px; aspect-ratio: 4/3; }.frame-top, .frame-caption { left: 20px; right: 20px; }.frame-caption strong { max-width: 230px; }.evidence-strip { grid-template-columns: repeat(3,1fr); }.evidence-item { min-height: 58px; }.evidence-item:nth-child(5) { border-left: 0; }.section-heading { align-items: flex-start; flex-direction: column; }.sequence-grid, .sequence-grid.count-1, .sequence-grid.count-2 { grid-template-columns: 1fr; }.capability-grid { grid-template-columns: 1fr 1fr; }.capability-grid article { min-height: 190px; padding: 16px 13px; }.world-section { padding: 25px 18px; }.world-data { grid-template-columns: 1fr; }.closing-section { min-height: 330px; margin-top: 75px; }.showcase-footer { align-items: flex-start; flex-direction: column; justify-content: center; gap: 8px; }
}
</style>
