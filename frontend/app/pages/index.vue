<template>
  <div class="dashboard-page">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>

    <div v-if="loading" class="dashboard-shell loading-view" aria-busy="true">
      <div class="hero-skeleton skeleton"></div>
      <div class="section-head skeleton-line"></div>
      <div class="project-grid">
        <div v-for="i in 3" :key="i" class="project-skeleton skeleton"></div>
      </div>
    </div>

    <div v-else-if="loadError" class="dashboard-shell state-shell">
      <div class="state-card">
        <div class="state-mark">
          <svg viewBox="0 0 24 24"><path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
        </div>
        <h1>{{ copy.loadFailed }}</h1>
        <p>{{ loadError }}</p>
        <button class="btn btn-primary" type="button" @click="load">{{ copy.retry }}</button>
      </div>
    </div>

    <div v-else class="dashboard-shell">
      <section class="hero" :class="{ 'has-project': featured }">
        <div class="hero-copy">
          <div class="eyebrow"><span></span> LINGDRAMA · AI PRODUCTION STUDIO</div>
          <h1 v-if="locale === 'zh-CN'">故事，不止被写下。<br><em>它被拍成一部短剧。</em></h1>
          <h1 v-else>Stories are not only written.<br><em>They become films.</em></h1>
          <p>{{ copy.heroDescription }}</p>

          <div class="hero-actions">
            <button class="btn btn-primary hero-primary" type="button" @click="navigateTo('/showcase')">
              <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4zM8 9l3 3-3 3m5 0h3"/></svg>
              {{ copy.viewShowcase }}
            </button>
            <button class="btn hero-secondary" type="button" @click="enterStudio">
              {{ copy.enterStudio }}
              <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <div class="real-stats" :aria-label="copy.overview">
            <div class="real-stat">
              <strong>{{ stats.projects }}</strong>
              <span>{{ copy.projects }}</span>
            </div>
            <i></i>
            <div class="real-stat">
              <strong>{{ stats.episodes }}</strong>
              <span>{{ copy.episodes }}</span>
            </div>
            <i></i>
            <div class="real-stat">
              <strong>{{ stats.assets }}</strong>
              <span>{{ copy.assets }}</span>
            </div>
            <i></i>
            <div class="real-stat">
              <strong>{{ stats.films }}</strong>
              <span>{{ copy.finalCuts }}</span>
            </div>
          </div>
        </div>

        <article v-if="featured" class="featured-project">
          <div class="feature-media">
            <video
              v-if="projectPreviewVideo(featured)"
              :src="projectPreviewVideo(featured)"
              :poster="projectCover(featured) || undefined"
              controls
              playsinline
              preload="metadata"
            ></video>
            <img v-else-if="projectCover(featured)" :src="projectCover(featured)" :alt="featured.title" />
            <div v-else class="media-empty feature-empty">
              <span class="empty-orbit"></span>
              <strong>{{ projectInitial(featured) }}</strong>
              <small>{{ copy.awaitingVisuals }}</small>
            </div>
            <div class="feature-vignette"></div>
            <div class="frame-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            <span class="feature-index">FEATURED / {{ String(featured.id).padStart(3, '0') }}</span>
            <span class="feature-status"><i></i>{{ projectStage(featured) }}</span>
          </div>
          <div class="feature-info">
            <div class="feature-heading">
              <div>
              <span class="feature-kicker">{{ copy.latestResult }}</span>
                <h2>{{ featured.title }}</h2>
              </div>
              <button class="round-arrow" type="button" :aria-label="copy.openProject" @click="openProject(featured)"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></button>
            </div>
            <p>{{ projectSummary(featured) }}</p>
            <div class="feature-footer">
              <div class="feature-metric"><b>{{ featured.episodes?.length || 0 }}</b><span>{{ unitLabel('episode', featured.episodes?.length || 0) }}</span></div>
              <div class="feature-metric"><b>{{ featured.characters?.length || 0 }}</b><span>{{ unitLabel('character', featured.characters?.length || 0) }}</span></div>
              <div class="feature-metric"><b>{{ featured.scenes?.length || 0 }}</b><span>{{ unitLabel('scene', featured.scenes?.length || 0) }}</span></div>
              <div class="feature-progress">
                <span><b>{{ projectProgress(featured) }}%</b>{{ copy.productionProgress }}</span>
                <div><i :style="{ width: projectProgress(featured) + '%' }"></i></div>
              </div>
            </div>
          </div>
        </article>

        <div v-else class="featured-project feature-intro" aria-hidden="true">
          <div class="intro-grid"></div>
          <div class="intro-symbol">
            <span class="play-ring"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg></span>
            <strong>STORY<br>TO SCREEN</strong>
          </div>
          <div class="intro-timeline"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
      </section>

      <section class="capability-section">
        <div class="capability-head">
          <div>
            <span class="section-kicker">{{ copy.productionSystem }}</span>
            <h2>{{ copy.workflowTitle }}</h2>
            <p>{{ copy.workflowDescription }}</p>
          </div>
          <button class="workflow-showcase-link" type="button" @click="navigateTo('/showcase')">
            {{ copy.viewAllResults }}
            <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>

        <div class="capability-chain">
          <article v-for="(capability, index) in capabilities" :key="capability.key" class="capability-card">
            <div class="capability-top">
              <span class="capability-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="capability-signal"><i></i>{{ capability.value }} {{ capability.unit }}</span>
            </div>
            <div class="capability-node">
              <svg v-if="capability.key === 'story'" viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5zM8 9h8M8 13h8M8 17h5"/></svg>
              <svg v-else-if="capability.key === 'assets'" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M4 19c0-3 2-5 5-5s5 2 5 5M15 5h5v5h-5zM16 14h4v5h-4z"/></svg>
              <svg v-else-if="capability.key === 'shots'" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v14M16 5v14M3 10h5M16 10h5M3 15h5M16 15h5"/></svg>
              <svg v-else-if="capability.key === 'video'" viewBox="0 0 24 24"><rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 10 4-2v8l-4-2zM8 9l4 3-4 3z"/></svg>
              <svg v-else viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/><path d="m14 16 2 2 4-5"/></svg>
            </div>
            <h3>{{ capability.title }}</h3>
            <p>{{ capability.description }}</p>
            <span v-if="index < capabilities.length - 1" class="chain-arrow" aria-hidden="true"><i></i><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
          </article>
        </div>
      </section>

      <section id="project-library" class="project-library">
        <div class="section-head">
          <div>
            <span class="section-kicker">{{ copy.projectLibrary }}</span>
            <h2>{{ copy.yourProductions }}</h2>
            <p class="section-description">{{ copy.projectsDescription }}</p>
          </div>
          <div class="section-meta">
            <span>{{ dramas.length }} {{ unitLabel('project', dramas.length) }}</span>
            <button class="icon-create" type="button" :title="copy.newProject" @click="showCreate = true">
              <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            </button>
          </div>
        </div>

        <div v-if="dramas.length" class="project-grid">
          <article
            v-for="(drama, index) in dramas"
            :key="drama.id"
            class="project-card"
            :style="{ animationDelay: `${Math.min(index, 6) * 0.055}s` }"
            role="link"
            tabindex="0"
            @click="openProject(drama)"
            @keyup.enter="openProject(drama)"
          >
            <div class="project-media">
              <img v-if="projectCover(drama)" :src="projectCover(drama)" :alt="drama.title" loading="lazy" />
              <video v-else-if="projectPreviewVideo(drama)" :src="projectPreviewVideo(drama)" muted loop autoplay playsinline preload="metadata"></video>
              <div v-else class="media-empty">
                <span class="empty-lines"></span>
                <strong>{{ projectInitial(drama) }}</strong>
                <small>{{ copy.awaitingVisuals }}</small>
              </div>
              <div class="media-shade"></div>
              <span class="stage-pill"><i></i>{{ projectStage(drama) }}</span>
              <button class="delete-button" type="button" :title="copy.deleteProject" @click.stop="delDrama(drama)">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>
              </button>
              <span class="project-number">{{ String(index + 1).padStart(2, '0') }}</span>
            </div>
            <div class="project-body">
              <div class="project-title-row">
                <h3>{{ drama.title }}</h3>
                <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
              </div>
              <div class="project-meta">
                <span>{{ drama.episodes?.length || 0 }} {{ unitLabel('episode', drama.episodes?.length || 0) }}</span>
                <i></i>
                <span>{{ drama.characters?.length || 0 }} {{ unitLabel('character', drama.characters?.length || 0) }}</span>
                <i></i>
                <span>{{ visualAssetCount(drama) }} {{ unitLabel('visual', visualAssetCount(drama)) }}</span>
              </div>
              <div class="project-progress-row">
                <div class="project-progress"><i :style="{ width: projectProgress(drama) + '%' }"></i></div>
                <span>{{ projectProgress(drama) }}%</span>
                <time>{{ fmtDate(drama.updated_at || drama.updatedAt) }}</time>
              </div>
            </div>
          </article>

          <button class="new-project-card" type="button" @click="showCreate = true">
            <span class="new-project-icon"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>
            <strong>{{ copy.createNext }}</strong>
            <small>{{ copy.createNextDescription }}</small>
          </button>
        </div>

        <div v-else class="empty-library">
          <div class="empty-storyboard">
            <span v-for="i in 5" :key="i"><i></i></span>
          </div>
          <h3>{{ copy.emptyTitle }}</h3>
          <p>{{ copy.emptyDescription }}</p>
          <button class="btn btn-primary" type="button" @click="showCreate = true">{{ copy.createFirst }}</button>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <div v-if="showCreate" class="overlay create-overlay" @click.self="closeCreate">
        <div class="create-modal" role="dialog" aria-modal="true" :aria-label="copy.createDialog">
          <div class="modal-visual">
            <div class="modal-visual-grid"></div>
            <span class="modal-sequence">01 — PROJECT SETUP</span>
            <div class="modal-symbol"><svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"/></svg></div>
            <strong>{{ copy.modalStatement }}</strong>
            <p>{{ copy.modalStatementSub }}</p>
          </div>
          <div class="modal-content">
            <button class="modal-close" type="button" :aria-label="copy.cancel" @click="closeCreate">
              <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>
            </button>
            <span class="modal-kicker">LINGDRAMA · NEW PRODUCTION</span>
            <h2>{{ copy.createDialog }}</h2>
            <p class="modal-description">{{ copy.createDescription }}</p>

            <form class="modal-form" @submit.prevent="create">
              <label class="field">
                <span class="field-label">{{ copy.projectName }} <i>*</i></span>
                <input v-model="form.title" class="input" :placeholder="copy.projectPlaceholder" required autofocus />
              </label>
              <div class="form-row">
                <label class="field">
                  <span class="field-label">{{ copy.plannedEpisodes }}</span>
                  <input v-model.number="form.total_episodes" class="input" type="number" min="1" max="100" />
                </label>
                <label class="field">
                  <span class="field-label">{{ copy.visualStyle }}</span>
                  <BaseSelect v-model="form.style" :options="styleSelectOptions" :placeholder="copy.selectStyle" searchable />
                </label>
              </div>
              <div class="modal-actions">
                <button class="btn" type="button" @click="closeCreate">{{ copy.cancel }}</button>
                <button class="btn btn-primary" type="submit" :disabled="creating || !form.title.trim()">
                  <svg v-if="!creating" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  <span v-else class="spinner"></span>
                  {{ creating ? copy.creating : copy.createProject }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { dramaAPI } from '~/composables/useApi'
import { useLingLocale } from '~/composables/useLingLocale'
import BaseSelect from '~/components/BaseSelect.vue'

const { locale } = useLingLocale()
const dramas = ref([])
const loading = ref(true)
const loadError = ref('')
const showCreate = ref(false)
const creating = ref(false)
const form = ref({ title: '', total_episodes: 1, style: 'cinematic' })
const styles = ['realistic', 'cinematic', 'anime', 'comic', 'ghibli', 'watercolor']

const copy = computed(() => locale.value === 'en-US' ? {
  heroDescription: 'LingDrama turns source material into a coherent short-drama production — from story development and visual assets to shots, video, review, and final delivery.',
  newProject: 'New production', viewShowcase: 'View results gallery', enterStudio: 'Enter production studio', overview: 'Production overview',
  projects: 'Projects', episodes: 'Episodes', assets: 'Assets', finalCuts: 'Final cuts', latestResult: 'LATEST RELEASE', openProject: 'Open production project',
  episodeUnit: 'episodes', characterUnit: 'characters', sceneUnit: 'scenes', visualAssetUnit: 'visuals', productionProgress: 'Production progress',
  productionSystem: 'PRODUCTION SYSTEM', workflowTitle: 'One story. One continuous production chain.',
  workflowDescription: 'Every stage stays connected, so characters, scenes, shots, sound, and delivery remain part of the same production context.',
  viewAllResults: 'Explore the results gallery',
  projectLibrary: 'REAL PRODUCTIONS', yourProductions: 'Projects made with LingDrama', projectsDescription: 'Real project records, footage, and production progress from this workspace.', projectUnit: 'projects', deleteProject: 'Delete project',
  awaitingVisuals: 'Visual assets pending', createNext: 'Start another story', createNextDescription: 'Build a new production from source material',
  emptyTitle: 'Your first production starts here', emptyDescription: 'Create a project, add your story, and move from script to final cut in one workspace.', createFirst: 'Create first project',
  createDialog: 'Create drama project', createDescription: 'Set the basic direction. You can refine the script, cast, and visual language inside the workspace.',
  modalStatement: 'From the first line\nto the final frame.', modalStatementSub: 'One production system for stories, characters, shots, and delivery.',
  projectName: 'Project name', projectPlaceholder: 'Example: The 59th Second', plannedEpisodes: 'Planned episodes', visualStyle: 'Visual style', selectStyle: 'Select a style',
  cancel: 'Cancel', createProject: 'Create project', creating: 'Creating…', loadFailed: 'Projects could not be loaded', retry: 'Try again',
  confirmDelete: (title) => `Delete “${title}”? This cannot be undone.`, deleted: 'Project deleted', createError: 'Project could not be created',
  noDescription: (episodes, assets) => `${episodes} episodes · ${assets} production assets ready for development.`,
  justNow: 'Just now', minutesAgo: (n) => `${n} min ago`, hoursAgo: (n) => `${n} hr ago`, daysAgo: (n) => `${n} d ago`,
  stages: { deliver: 'Ready to deliver', production: 'In production', script: 'Script ready', prep: 'In development' },
  workflow: {
    story: { title: 'Story & script', description: 'Develop source material into a structured, production-ready script.' },
    assets: { title: 'Characters & worlds', description: 'Build reusable character, scene, and visual references for continuity.' },
    shots: { title: 'Storyboard direction', description: 'Break the script into executable shots, framing, action, and prompts.' },
    video: { title: 'Video production', description: 'Generate motion from keyframes, then combine dialogue, sound, and subtitles.' },
    delivery: { title: 'Review & delivery', description: 'Review every shot, assemble the episode, and export the final video.' },
  },
  styleLabels: { realistic: 'Realistic', cinematic: 'Cinematic', anime: 'Anime', comic: 'Graphic novel', ghibli: 'Painterly anime', watercolor: 'Watercolor' },
} : {
  heroDescription: '灵动 LingDrama 将故事原文变成一条连贯的短剧生产链——从故事开发、视觉资产与分镜，到视频制作、审片和最终交付。',
  newProject: '新建短剧', viewShowcase: '查看成果展厅', enterStudio: '进入制作空间', overview: '制作概览',
  projects: '项目', episodes: '剧集', assets: '生产资产', finalCuts: '成片', latestResult: '最新成果', openProject: '打开制作项目',
  episodeUnit: '集', characterUnit: '角色', sceneUnit: '场景', visualAssetUnit: '视觉资产', productionProgress: '制作进度',
  productionSystem: 'PRODUCTION SYSTEM', workflowTitle: '一个故事，一条完整生产链。',
  workflowDescription: '所有阶段共享同一份创作上下文，让人物、场景、镜头、声音与交付始终保持连接。',
  viewAllResults: '浏览全部成果',
  projectLibrary: 'REAL PRODUCTIONS', yourProductions: 'LingDrama 真实制作案例', projectsDescription: '这里展示来自当前制作空间的真实项目、画面与生产进度。', projectUnit: '个项目', deleteProject: '删除项目',
  awaitingVisuals: '等待视觉资产', createNext: '开始另一个故事', createNextDescription: '从故事原文建立新的短剧制作项目',
  emptyTitle: '第一部作品，从这里开始', emptyDescription: '创建项目、放入故事，在同一个工作空间里完成从剧本到成片。', createFirst: '创建第一个项目',
  createDialog: '新建短剧项目', createDescription: '先确定基本方向；剧本、角色、风格与镜头都可以在制作工作台里继续完善。',
  modalStatement: '从第一行文字，\n到最后一帧影像。', modalStatementSub: '用一套制作系统管理故事、角色、镜头与最终交付。',
  projectName: '项目名称', projectPlaceholder: '例如：《第59秒》', plannedEpisodes: '计划集数', visualStyle: '视觉风格', selectStyle: '选择风格',
  cancel: '取消', createProject: '创建项目', creating: '创建中…', loadFailed: '项目数据暂时无法载入', retry: '重新载入',
  confirmDelete: (title) => `确定删除「${title}」？此操作不可恢复。`, deleted: '项目已删除', createError: '项目创建失败',
  noDescription: (episodes, assets) => `已建立 ${episodes} 集内容与 ${assets} 项生产资产，可继续进入制作。`,
  justNow: '刚刚', minutesAgo: (n) => `${n} 分钟前`, hoursAgo: (n) => `${n} 小时前`, daysAgo: (n) => `${n} 天前`,
  stages: { deliver: '可交付', production: '制作中', script: '剧本就绪', prep: '筹备中' },
  workflow: {
    story: { title: '故事与剧本', description: '把故事原文整理为结构清晰、可以进入生产的短剧剧本。' },
    assets: { title: '角色与世界', description: '建立可复用的角色、场景与视觉参考，保持内容连续性。' },
    shots: { title: '导演与分镜', description: '将剧本拆解为可执行的景别、构图、动作与生成提示。' },
    video: { title: '视频生产', description: '由关键帧生成动态镜头，并完成对白、声音与字幕合成。' },
    delivery: { title: '审片与交付', description: '逐镜检查、整集合成并导出可以直接交付的最终成片。' },
  },
  styleLabels: { realistic: '写实', cinematic: '电影感', anime: '动画', comic: '漫画', ghibli: '手绘动画', watercolor: '水彩' },
})

const styleSelectOptions = computed(() => styles.map(style => ({ label: copy.value.styleLabels[style], value: style })))
const featured = computed(() => dramas.value[0] || null)
const stats = computed(() => dramas.value.reduce((result, drama) => {
  result.projects += 1
  result.episodes += drama.episodes?.length || 0
  result.assets += (drama.characters?.length || 0) + (drama.scenes?.length || 0)
  result.films += drama.production_summary?.final_ready
    ? 1
    : (drama.episodes || []).filter(episode => episode.video_url || episode.videoUrl).length
  result.shots += drama.production_summary?.shots || 0
  result.videoShots += drama.production_summary?.videos_ready || 0
  return result
}, { projects: 0, episodes: 0, assets: 0, films: 0, shots: 0, videoShots: 0 }))

const capabilities = computed(() => [
  { key: 'story', ...copy.value.workflow.story, value: stats.value.episodes, unit: unitLabel('episode', stats.value.episodes) },
  { key: 'assets', ...copy.value.workflow.assets, value: stats.value.assets, unit: unitLabel('asset', stats.value.assets) },
  { key: 'shots', ...copy.value.workflow.shots, value: stats.value.shots, unit: unitLabel('shot', stats.value.shots) },
  { key: 'video', ...copy.value.workflow.video, value: stats.value.videoShots, unit: unitLabel('videoShot', stats.value.videoShots) },
  { key: 'delivery', ...copy.value.workflow.delivery, value: stats.value.films, unit: unitLabel('finalCut', stats.value.films) },
])

function unitLabel(kind, count) {
  if (locale.value === 'zh-CN') {
    return { episode: '集', character: '角色', scene: '场景', project: '个项目', visual: '视觉资产', asset: '生产资产', shot: '镜头', videoShot: '视频镜头', finalCut: '成片' }[kind] || ''
  }
  const labels = {
    episode: ['episode', 'episodes'], character: ['character', 'characters'], scene: ['scene', 'scenes'], project: ['project', 'projects'],
    visual: ['visual', 'visuals'], asset: ['asset', 'assets'], shot: ['shot', 'shots'], videoShot: ['video shot', 'video shots'], finalCut: ['final cut', 'final cuts'],
  }
  const pair = labels[kind] || ['', '']
  return count === 1 ? pair[0] : pair[1]
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await dramaAPI.list()
    dramas.value = result.items || []
  } catch (error) {
    loadError.value = error?.message || copy.value.loadFailed
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.title.trim() || creating.value) return
  creating.value = true
  try {
    const drama = await dramaAPI.create({ ...form.value, title: form.value.title.trim() })
    closeCreate()
    await navigateTo(`/drama/${drama.id}`)
  } catch (error) {
    toast.error(error?.message || copy.value.createError)
  } finally {
    creating.value = false
  }
}

async function delDrama(drama) {
  if (!confirm(copy.value.confirmDelete(drama.title))) return
  try {
    await dramaAPI.del(drama.id)
    toast.success(copy.value.deleted)
    await load()
  } catch (error) {
    toast.error(error?.message || copy.value.loadFailed)
  }
}

function closeCreate() {
  if (creating.value) return
  showCreate.value = false
}

function openProject(drama) {
  navigateTo(`/drama/${drama.id}`)
}

function enterStudio() {
  if (featured.value) {
    openProject(featured.value)
    return
  }
  showCreate.value = true
}

function scrollProjects() {
  document.getElementById('project-library')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function mediaUrl(value) {
  if (!value) return ''
  const url = String(value)
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return url.startsWith('/') ? url : `/${url}`
}

function projectCover(drama) {
  const sources = [
    drama.preview_image,
    drama.previewImage,
    drama.thumbnail,
    ...(drama.episodes || []).flatMap(episode => [episode.thumbnail]),
    ...(drama.scenes || []).flatMap(scene => [scene.image_url, scene.imageUrl]),
    ...(drama.characters || []).flatMap(character => [character.image_url, character.imageUrl]),
  ]
  return mediaUrl(sources.find(Boolean))
}

function projectPreviewVideo(drama) {
  return mediaUrl(drama.preview_video || drama.previewVideo)
}

function visualAssetCount(drama) {
  if (drama.production_summary?.images_ready != null) return drama.production_summary.images_ready
  return [...(drama.characters || []), ...(drama.scenes || [])]
    .filter(item => item.image_url || item.imageUrl).length
}

function projectProgress(drama) {
  const summary = drama.production_summary
  if (summary?.final_ready) return 100
  if (summary?.shots) {
    const imageRatio = Math.min(1, (summary.images_ready || 0) / summary.shots)
    const videoRatio = Math.min(1, (summary.videos_ready || 0) / summary.shots)
    return Math.round(38 + imageRatio * 24 + videoRatio * 33)
  }
  const episodes = drama.episodes || []
  if (!episodes.length) return 0
  const total = episodes.reduce((sum, episode) => {
    if (episode.video_url || episode.videoUrl) return sum + 100
    if (episode.thumbnail) return sum + 75
    if (episode.script_content || episode.scriptContent) return sum + 48
    if (episode.content) return sum + 18
    return sum
  }, 0)
  return Math.round(total / episodes.length)
}

function projectStage(drama) {
  const episodes = drama.episodes || []
  if (drama.production_summary?.final_ready) return copy.value.stages.deliver
  if (drama.production_summary?.videos_ready > 0 || drama.production_summary?.images_ready > 0) return copy.value.stages.production
  if (episodes.some(episode => episode.video_url || episode.videoUrl)) return copy.value.stages.deliver
  if (visualAssetCount(drama) > 0) return copy.value.stages.production
  if (episodes.some(episode => episode.script_content || episode.scriptContent)) return copy.value.stages.script
  return copy.value.stages.prep
}

function projectSummary(drama) {
  return copy.value.noDescription(
    drama.episodes?.length || 0,
    (drama.characters?.length || 0) + (drama.scenes?.length || 0),
  )
}

function projectInitial(drama) {
  return (drama.title || 'L').trim().slice(0, 1).toUpperCase()
}

function fmtDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return copy.value.justNow
  if (diff < 3_600_000) return copy.value.minutesAgo(Math.floor(diff / 60_000))
  if (diff < 86_400_000) return copy.value.hoursAgo(Math.floor(diff / 3_600_000))
  if (diff < 604_800_000) return copy.value.daysAgo(Math.floor(diff / 86_400_000))
  return date.toLocaleDateString(locale.value, { month: 'short', day: 'numeric' })
}

function onKeydown(event) {
  if (event.key === 'Escape' && showCreate.value) closeCreate()
}

onMounted(() => {
  load()
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.dashboard-page {
  position: relative;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  isolation: isolate;
}
.dashboard-page::before {
  content: '';
  position: fixed;
  inset: 68px 0 0;
  z-index: -2;
  pointer-events: none;
  opacity: 0.34;
  background-image: linear-gradient(rgba(130, 161, 207, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(130, 161, 207, 0.035) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: linear-gradient(to bottom, black, transparent 74%);
}
.ambient { position: fixed; z-index: -1; border-radius: 50%; filter: blur(1px); pointer-events: none; }
.ambient-one { width: 540px; height: 540px; top: 40px; right: -180px; background: radial-gradient(circle, rgba(78, 115, 255, 0.12), transparent 67%); }
.ambient-two { width: 440px; height: 440px; top: 420px; left: -230px; background: radial-gradient(circle, rgba(57, 202, 255, 0.09), transparent 68%); }
.dashboard-shell { width: min(1480px, calc(100% - 72px)); margin: 0 auto; padding: 40px 0 72px; }

.hero { min-height: 500px; display: grid; grid-template-columns: minmax(0, .88fr) minmax(480px, 1.12fr); gap: 56px; align-items: center; padding: 28px 0 54px; }
.hero-copy { position: relative; z-index: 2; }
.eyebrow { display: flex; align-items: center; gap: 9px; color: var(--text-3); font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: .16em; }
.eyebrow > span { width: 24px; height: 1px; background: var(--accent); box-shadow: 0 0 12px rgba(104, 216, 255, .65); }
.hero h1 { margin-top: 22px; font-size: clamp(42px, 4.2vw, 69px); line-height: 1.08; letter-spacing: -.055em; }
.hero h1 em { color: transparent; background: linear-gradient(100deg, #dff9ff 0%, #71dcff 44%, #9f91ff 92%); background-clip: text; -webkit-background-clip: text; font-style: normal; }
.hero-copy > p { max-width: 610px; margin-top: 24px; color: var(--text-2); font-size: 14px; line-height: 1.9; }
.hero-actions { display: flex; align-items: center; gap: 10px; margin-top: 30px; }
.hero-actions .btn { min-height: 43px; padding: 0 18px; }
.hero-actions svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.hero-secondary { background: rgba(15, 21, 34, .62); }
.real-stats { display: flex; align-items: center; gap: 22px; margin-top: 42px; }
.real-stats > i { width: 1px; height: 26px; background: var(--border); }
.real-stat { display: flex; flex-direction: column; gap: 2px; }
.real-stat strong { color: var(--text-0); font-family: var(--font-mono); font-size: 19px; line-height: 1; }
.real-stat span { color: var(--text-3); font-size: 10px; font-weight: 600; letter-spacing: .05em; }

.featured-project { width: 100%; padding: 0; color: inherit; text-align: left; background: rgba(11, 16, 27, .84); border: 1px solid var(--border); border-radius: 24px; box-shadow: 0 38px 100px rgba(0, 0, 0, .38); overflow: hidden; transition: transform .35s var(--ease-out), border-color .3s, box-shadow .3s; }
.featured-project:hover { transform: translateY(-5px); border-color: rgba(109, 211, 255, .3); box-shadow: 0 46px 110px rgba(0, 0, 0, .47), 0 0 55px rgba(70, 111, 255, .07); }
.feature-media { position: relative; height: 310px; overflow: hidden; background: #090c14; }
.feature-media > img, .feature-media > video { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .7s var(--ease-out); }
.featured-project:hover .feature-media > img, .featured-project:hover .feature-media > video { transform: scale(1.035); }
.feature-vignette, .media-shade { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(3, 6, 12, .08), transparent 48%, rgba(4, 7, 13, .82)); }
.feature-index { position: absolute; left: 18px; top: 17px; color: rgba(235, 244, 255, .72); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: .14em; text-shadow: 0 1px 8px #000; }
.feature-status, .stage-pill { position: absolute; right: 18px; top: 15px; display: flex; align-items: center; gap: 6px; min-height: 25px; padding: 0 9px; color: #ddf9ff; background: rgba(5, 10, 18, .64); border: 1px solid rgba(150, 205, 232, .2); border-radius: 999px; backdrop-filter: blur(12px); font-size: 9px; font-weight: 600; }
.feature-status i, .stage-pill i { width: 5px; height: 5px; border-radius: 50%; background: var(--success); box-shadow: 0 0 9px rgba(84, 219, 156, .75); }
.frame-corners { position: absolute; inset: 14px; pointer-events: none; }
.frame-corners i { position: absolute; width: 14px; height: 14px; border-color: rgba(222, 244, 255, .38); border-style: solid; }
.frame-corners i:nth-child(1) { left: 0; top: 0; border-width: 1px 0 0 1px; }
.frame-corners i:nth-child(2) { right: 0; top: 0; border-width: 1px 1px 0 0; }
.frame-corners i:nth-child(3) { left: 0; bottom: 0; border-width: 0 0 1px 1px; }
.frame-corners i:nth-child(4) { right: 0; bottom: 0; border-width: 0 1px 1px 0; }
.feature-info { padding: 22px 24px 20px; }
.feature-heading { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.feature-kicker { display: block; margin-bottom: 6px; color: var(--accent-text); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: .15em; }
.feature-heading h2 { max-width: 480px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 21px; }
.round-arrow { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; color: var(--text-2); background: var(--bg-2); border: 1px solid var(--border); border-radius: 50%; cursor: pointer; transition: color .18s, border-color .18s, transform .18s; }
.round-arrow:hover { color: var(--accent); border-color: var(--border-strong); transform: translateX(2px); }
.round-arrow svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.feature-info > p { margin-top: 11px; color: var(--text-3); font-size: 11px; line-height: 1.65; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.feature-footer { display: flex; align-items: flex-end; gap: 22px; margin-top: 18px; padding-top: 15px; border-top: 1px solid var(--border); }
.feature-metric { display: flex; flex-direction: column; }
.feature-metric b { color: var(--text-1); font-family: var(--font-mono); font-size: 13px; }
.feature-metric span { color: var(--text-3); font-size: 9px; }
.feature-progress { min-width: 150px; margin-left: auto; }
.feature-progress > span { display: flex; justify-content: space-between; color: var(--text-3); font-size: 9px; }
.feature-progress > span b { color: var(--text-1); font-family: var(--font-mono); }
.feature-progress > div { height: 3px; margin-top: 7px; overflow: hidden; background: var(--bg-3); border-radius: 99px; }
.feature-progress > div i { display: block; height: 100%; background: var(--accent-gradient); border-radius: inherit; box-shadow: 0 0 12px var(--accent-glow); }

.media-empty { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; color: var(--text-3); background: radial-gradient(circle at 50% 40%, rgba(69, 117, 235, .16), transparent 34%), linear-gradient(140deg, #0d1321, #080b12); }
.media-empty strong { position: relative; z-index: 2; color: rgba(211, 233, 255, .8); font-size: 48px; font-weight: 500; }
.media-empty small { position: relative; z-index: 2; margin-top: 5px; font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; text-transform: uppercase; }
.empty-orbit { position: absolute; width: 190px; height: 190px; border: 1px solid rgba(101, 196, 255, .13); border-radius: 50%; box-shadow: inset 0 0 50px rgba(91, 103, 255, .08); }
.empty-orbit::before, .empty-orbit::after { content: ''; position: absolute; inset: 25px; border: 1px solid rgba(137, 105, 255, .11); border-radius: 50%; }
.empty-orbit::after { inset: 58px; background: rgba(80, 207, 255, .05); }

.feature-intro { position: relative; min-height: 430px; cursor: default; background: radial-gradient(circle at 60% 32%, rgba(70, 121, 255, .18), transparent 29%), linear-gradient(145deg, #0c1220, #080b12); }
.intro-grid, .modal-visual-grid { position: absolute; inset: 0; opacity: .3; background-image: linear-gradient(rgba(140, 173, 220, .1) 1px, transparent 1px), linear-gradient(90deg, rgba(140, 173, 220, .1) 1px, transparent 1px); background-size: 34px 34px; mask-image: radial-gradient(circle at center, black, transparent 78%); }
.intro-symbol { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 22px; }
.intro-symbol strong { color: rgba(229, 243, 255, .78); font-size: 28px; line-height: 1.05; letter-spacing: -.04em; }
.play-ring { width: 88px; height: 88px; display: grid; place-items: center; color: var(--accent); border: 1px solid rgba(102, 207, 255, .28); border-radius: 50%; box-shadow: 0 0 55px rgba(70, 154, 255, .14), inset 0 0 28px rgba(88, 111, 255, .08); }
.play-ring svg { width: 31px; height: 31px; fill: none; stroke: currentColor; stroke-width: 1.2; }
.intro-timeline { position: absolute; left: 30px; right: 30px; bottom: 28px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; }
.intro-timeline i { height: 4px; background: rgba(149, 176, 218, .12); border-radius: 99px; }
.intro-timeline i:first-child { background: linear-gradient(90deg, var(--accent), #7085ff); box-shadow: 0 0 12px rgba(81, 201, 255, .3); }

.capability-section { position: relative; padding: 62px 0 66px; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
.capability-section::before { content: ''; position: absolute; inset: 0 14%; pointer-events: none; background: radial-gradient(circle at 50% 50%, rgba(61, 117, 255, .06), transparent 60%); }
.capability-head { position: relative; display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; margin-bottom: 30px; }
.capability-head h2 { max-width: 720px; font-size: 29px; }
.capability-head p { max-width: 680px; margin-top: 10px; color: var(--text-3); font-size: 11px; line-height: 1.75; }
.workflow-showcase-link { display: inline-flex; align-items: center; gap: 7px; min-height: 35px; padding: 0 12px; color: var(--accent-text); background: var(--accent-bg); border: 1px solid rgba(100, 210, 255, .14); border-radius: 9px; cursor: pointer; font-size: 10px; font-weight: 700; white-space: nowrap; transition: border-color .18s, transform .18s; }
.workflow-showcase-link:hover { border-color: rgba(100, 210, 255, .34); transform: translateX(2px); }
.workflow-showcase-link svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.capability-chain { position: relative; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.capability-card { position: relative; min-width: 0; min-height: 245px; padding: 19px 17px 18px; background: linear-gradient(150deg, rgba(18, 25, 40, .86), rgba(10, 14, 23, .72)); border: 1px solid var(--border); border-radius: 15px; box-shadow: 0 14px 35px rgba(0, 0, 0, .16); transition: transform .22s var(--ease-out), border-color .2s, background .2s; }
.capability-card:hover { z-index: 2; transform: translateY(-4px); border-color: rgba(100, 210, 255, .24); background: linear-gradient(150deg, rgba(21, 31, 49, .94), rgba(11, 16, 27, .84)); }
.capability-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.capability-index { color: var(--text-3); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: .12em; }
.capability-signal { display: flex; align-items: center; gap: 5px; color: var(--text-3); font-family: var(--font-mono); font-size: 7px; white-space: nowrap; }
.capability-signal i { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px rgba(104, 216, 255, .7); }
.capability-node { width: 44px; height: 44px; display: grid; place-items: center; margin-top: 28px; color: var(--accent-text); background: linear-gradient(135deg, rgba(75, 201, 255, .11), rgba(111, 100, 255, .1)); border: 1px solid rgba(107, 204, 255, .13); border-radius: 13px; }
.capability-node svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.capability-card h3 { margin-top: 18px; font-size: 14px; }
.capability-card > p { margin-top: 8px; color: var(--text-3); font-size: 9.5px; line-height: 1.7; }
.chain-arrow { position: absolute; z-index: 3; right: -16px; top: 91px; width: 21px; height: 21px; display: grid; place-items: center; color: var(--text-3); background: #0b101b; border: 1px solid var(--border); border-radius: 50%; }
.chain-arrow > i { position: absolute; left: -7px; right: -7px; height: 1px; z-index: -1; background: linear-gradient(90deg, rgba(104, 216, 255, .3), rgba(120, 107, 255, .28)); }
.chain-arrow svg { width: 10px; height: 10px; fill: none; stroke: currentColor; stroke-width: 1.8; }

.project-library { scroll-margin-top: 24px; padding-top: 58px; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 22px; }
.section-kicker { display: block; margin-bottom: 7px; color: var(--text-3); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: .18em; }
.section-head h2 { font-size: 25px; }
.section-description { max-width: 620px; margin-top: 8px; color: var(--text-3); font-size: 10px; line-height: 1.65; }
.section-meta { display: flex; align-items: center; gap: 12px; color: var(--text-3); font-size: 10px; }
.icon-create { width: 33px; height: 33px; display: grid; place-items: center; color: var(--text-2); background: var(--bg-2); border: 1px solid var(--border); border-radius: 9px; cursor: pointer; }
.icon-create:hover { color: var(--accent); border-color: var(--border-strong); }
.icon-create svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; }
.project-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.project-card { min-width: 0; overflow: hidden; background: rgba(12, 17, 28, .78); border: 1px solid var(--border); border-radius: 17px; cursor: pointer; box-shadow: 0 14px 38px rgba(0, 0, 0, .2); animation: fadeUp .45s var(--ease-out) both; transition: transform .25s var(--ease-out), border-color .22s, box-shadow .22s; }
.project-card:hover { transform: translateY(-4px); border-color: rgba(102, 207, 255, .25); box-shadow: 0 24px 54px rgba(0, 0, 0, .3); }
.project-media { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: #090d15; }
.project-media > img, .project-media > video { width: 100%; height: 100%; display: block; object-fit: cover; transition: transform .55s var(--ease-out); }
.project-card:hover .project-media > img, .project-card:hover .project-media > video { transform: scale(1.045); }
.project-media .media-empty strong { font-size: 32px; }
.empty-lines { position: absolute; width: 130%; height: 80px; border-top: 1px solid rgba(92, 207, 255, .1); border-bottom: 1px solid rgba(123, 103, 255, .1); transform: rotate(-12deg); }
.stage-pill { left: 13px; right: auto; top: 12px; min-height: 22px; font-size: 8px; }
.delete-button { position: absolute; top: 11px; right: 11px; width: 29px; height: 29px; display: grid; place-items: center; color: rgba(237, 245, 255, .68); background: rgba(5, 8, 14, .58); border: 1px solid rgba(210, 228, 249, .12); border-radius: 8px; backdrop-filter: blur(10px); cursor: pointer; opacity: 0; transform: translateY(-3px); transition: opacity .18s, transform .18s, color .18s, background .18s; }
.project-card:hover .delete-button, .delete-button:focus-visible { opacity: 1; transform: translateY(0); }
.delete-button:hover { color: #fff; background: rgba(204, 58, 82, .72); }
.delete-button svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.project-number { position: absolute; right: 14px; bottom: 10px; z-index: 2; color: rgba(236, 246, 255, .48); font-family: var(--font-mono); font-size: 9px; letter-spacing: .08em; }
.project-body { padding: 17px 17px 15px; }
.project-title-row { display: flex; align-items: center; justify-content: space-between; gap: 15px; }
.project-title-row h3 { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 15px; }
.project-title-row > svg { width: 14px; height: 14px; flex: 0 0 auto; fill: none; stroke: var(--text-3); stroke-width: 1.8; transition: transform .2s, stroke .2s; }
.project-card:hover .project-title-row > svg { stroke: var(--accent); transform: translateX(2px); }
.project-meta { display: flex; align-items: center; gap: 8px; margin-top: 9px; color: var(--text-3); font-size: 9px; }
.project-meta i { width: 2px; height: 2px; border-radius: 50%; background: var(--text-3); }
.project-progress-row { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding-top: 13px; border-top: 1px solid var(--border); }
.project-progress { flex: 1; height: 3px; overflow: hidden; background: var(--bg-3); border-radius: 99px; }
.project-progress i { display: block; height: 100%; background: var(--accent-gradient); border-radius: inherit; }
.project-progress-row > span { color: var(--text-2); font-family: var(--font-mono); font-size: 9px; }
.project-progress-row time { margin-left: 6px; color: var(--text-3); font-size: 9px; white-space: nowrap; }
.new-project-card { min-height: 269px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-3); background: rgba(10, 14, 23, .46); border: 1px dashed rgba(135, 167, 211, .19); border-radius: 17px; cursor: pointer; transition: background .2s, border-color .2s, transform .2s var(--ease-out); }
.new-project-card:hover { transform: translateY(-3px); color: var(--text-2); background: rgba(15, 22, 36, .7); border-color: rgba(100, 207, 255, .32); }
.new-project-icon { width: 43px; height: 43px; display: grid; place-items: center; margin-bottom: 4px; color: var(--accent); background: var(--accent-bg); border: 1px solid rgba(102, 209, 255, .14); border-radius: 13px; }
.new-project-icon svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.new-project-card strong { color: var(--text-1); font-size: 13px; }
.new-project-card small { max-width: 230px; font-size: 10px; line-height: 1.6; }

.empty-library { display: flex; flex-direction: column; align-items: center; padding: 58px 28px; color: var(--text-3); background: rgba(10, 15, 25, .52); border: 1px dashed var(--border-strong); border-radius: 20px; text-align: center; }
.empty-storyboard { display: flex; gap: 6px; margin-bottom: 22px; padding: 7px; background: var(--bg-1); border: 1px solid var(--border); border-radius: 8px; }
.empty-storyboard > span { width: 48px; height: 30px; display: grid; place-items: center; background: var(--bg-2); border-radius: 4px; }
.empty-storyboard i { width: 8px; height: 8px; border: 1px solid var(--text-3); border-radius: 50%; opacity: .5; }
.empty-library h3 { font-size: 18px; }
.empty-library p { max-width: 480px; margin: 8px 0 20px; font-size: 12px; }

.loading-view { padding-top: 48px; }
.skeleton { background: linear-gradient(100deg, var(--bg-1) 25%, var(--bg-2) 48%, var(--bg-1) 72%); background-size: 220% 100%; animation: shimmer 1.5s infinite; border: 1px solid var(--border); }
.hero-skeleton { height: 480px; border-radius: 24px; }
.skeleton-line { width: 260px; height: 30px; margin: 44px 0 20px; border-radius: 8px; }
.project-skeleton { height: 275px; border-radius: 17px; }
.state-shell { height: 100%; display: grid; place-items: center; }
.state-card { display: flex; flex-direction: column; align-items: center; max-width: 440px; padding: 44px; text-align: center; }
.state-mark { width: 58px; height: 58px; display: grid; place-items: center; color: var(--error); background: var(--error-bg); border: 1px solid rgba(255, 113, 136, .14); border-radius: 18px; }
.state-mark svg { width: 26px; height: 26px; fill: none; stroke: currentColor; stroke-width: 1.5; }
.state-card h1 { margin-top: 18px; font-size: 22px; }
.state-card p { margin: 8px 0 20px; color: var(--text-3); font-size: 12px; }

.create-overlay { z-index: 200; }
.create-modal { width: min(860px, calc(100vw - 36px)); min-height: 500px; display: grid; grid-template-columns: .8fr 1.2fr; overflow: hidden; color: var(--text-0); background: #0b101b; border: 1px solid var(--border-strong); border-radius: 24px; box-shadow: var(--shadow-elevated); animation: scaleIn .24s var(--ease-out); }
.modal-visual { position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; padding: 34px; background: radial-gradient(circle at 58% 35%, rgba(62, 151, 255, .22), transparent 26%), radial-gradient(circle at 50% 45%, rgba(121, 91, 255, .14), transparent 43%), #080c14; }
.modal-sequence { position: absolute; left: 28px; top: 27px; color: var(--text-3); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: .15em; }
.modal-symbol { position: absolute; left: 50%; top: 43%; width: 94px; height: 94px; display: grid; place-items: center; color: var(--accent); border: 1px solid rgba(105, 215, 255, .22); border-radius: 50%; box-shadow: 0 0 70px rgba(68, 141, 255, .2); transform: translate(-50%, -50%); }
.modal-symbol::before, .modal-symbol::after { content: ''; position: absolute; inset: -20px; border: 1px solid rgba(114, 137, 255, .09); border-radius: 50%; }
.modal-symbol::after { inset: -43px; }
.modal-symbol svg { width: 32px; height: 32px; fill: none; stroke: currentColor; stroke-width: 1.1; }
.modal-visual strong { position: relative; z-index: 2; max-width: 280px; white-space: pre-line; font-size: 25px; line-height: 1.15; letter-spacing: -.04em; }
.modal-visual p { position: relative; z-index: 2; margin-top: 10px; color: var(--text-3); font-size: 10px; line-height: 1.65; }
.modal-content { position: relative; padding: 46px 44px 38px; }
.modal-close { position: absolute; right: 18px; top: 18px; width: 32px; height: 32px; display: grid; place-items: center; color: var(--text-3); background: transparent; border: 1px solid transparent; border-radius: 9px; cursor: pointer; }
.modal-close:hover { color: var(--text-0); background: var(--bg-2); border-color: var(--border); }
.modal-close svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; }
.modal-kicker { color: var(--accent-text); font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: .16em; }
.modal-content h2 { margin-top: 9px; font-size: 26px; }
.modal-description { max-width: 450px; margin-top: 9px; color: var(--text-3); font-size: 11px; line-height: 1.7; }
.modal-form { display: flex; flex-direction: column; gap: 18px; margin-top: 29px; }
.field { display: flex; flex-direction: column; gap: 7px; }
.field-label { color: var(--text-2); font-size: 10px; font-weight: 700; letter-spacing: .04em; }
.field-label i { color: var(--error); font-style: normal; }
.form-row { display: grid; grid-template-columns: .75fr 1.25fr; gap: 13px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 8px; padding-top: 18px; border-top: 1px solid var(--border); }
.modal-actions svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; }
.spinner { width: 13px; height: 13px; border: 2px solid rgba(5, 14, 22, .25); border-top-color: #061019; border-radius: 50%; animation: spin .8s linear infinite; }

@media (max-width: 1120px) {
  .dashboard-shell { width: min(100% - 40px, 1100px); }
  .hero { grid-template-columns: minmax(0, .9fr) minmax(410px, 1.1fr); gap: 30px; }
  .hero h1 { font-size: clamp(38px, 5vw, 56px); }
  .feature-media { height: 270px; }
  .capability-chain { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .chain-arrow { display: none; }
  .project-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 820px) {
  .dashboard-page::before { inset: 60px 0 0; }
  .dashboard-shell { width: min(100% - 28px, 720px); padding-top: 25px; }
  .hero { min-height: 0; grid-template-columns: 1fr; gap: 32px; padding: 20px 0 44px; }
  .hero-copy > p { max-width: 640px; }
  .featured-project { max-width: 680px; }
  .feature-intro { min-height: 330px; }
  .capability-section { padding: 48px 0; }
  .capability-head { align-items: flex-start; flex-direction: column; gap: 18px; }
  .capability-chain { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .create-modal { grid-template-columns: 1fr; max-width: 570px; }
  .modal-visual { display: none; }
}

@media (max-width: 560px) {
  .dashboard-shell { width: calc(100% - 22px); padding-bottom: 46px; }
  .hero h1 { margin-top: 17px; font-size: 37px; }
  .hero-copy > p { margin-top: 18px; font-size: 12px; }
  .hero-actions { align-items: stretch; flex-direction: column; }
  .hero-actions .btn { width: 100%; }
  .real-stats { justify-content: space-between; gap: 8px; margin-top: 30px; }
  .real-stats > i { display: none; }
  .feature-media { height: 220px; }
  .feature-footer { gap: 14px; flex-wrap: wrap; }
  .feature-progress { width: 100%; margin-left: 0; }
  .capability-head h2 { font-size: 24px; }
  .capability-chain { grid-template-columns: 1fr; }
  .capability-card { min-height: 210px; }
  .capability-node { margin-top: 20px; }
  .project-grid { grid-template-columns: 1fr; }
  .section-head h2 { font-size: 21px; }
  .new-project-card { min-height: 190px; }
  .create-modal { width: calc(100vw - 20px); min-height: 0; }
  .modal-content { padding: 44px 22px 24px; }
  .form-row { grid-template-columns: 1fr; }
  .empty-storyboard > span { width: 38px; }
}
</style>
