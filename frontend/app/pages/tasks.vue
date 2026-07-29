<template>
  <div class="task-page">
    <section class="task-hero">
      <div>
        <p class="eyebrow">LINGDRAMA · PRODUCTION QUEUE</p>
        <h1>{{ copy('任务中心', 'Task Center') }}</h1>
        <p>{{ copy('追踪所有真实的图像与视频生成任务，快速定位完成、运行中和需要处理的记录。', 'Track real image and video jobs across projects, including completed, active, and attention-needed generations.') }}</p>
      </div>
      <div class="hero-actions">
        <span v-if="activeCount" class="live-indicator"><i></i>{{ copy(`${activeCount} 个任务运行中`, `${activeCount} jobs active`) }}</span>
        <button class="btn" :disabled="loading" @click="load">
          <svg :class="{ spinning: loading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M5.7 9a7 7 0 0 1 11.8-2.6L20 11M4 13l2.5 4.6A7 7 0 0 0 18.3 15"/></svg>
          {{ copy('刷新状态', 'Refresh status') }}
        </button>
      </div>
    </section>

    <section class="status-overview">
      <button v-for="filter in filters" :key="filter.value" :class="['overview-card', filter.value, { active: activeFilter === filter.value }]" @click="activeFilter = filter.value">
        <span class="overview-icon"><i></i></span>
        <span class="overview-copy">
          <small>{{ filter.label }}</small>
          <strong>{{ filter.count }}</strong>
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </section>

    <section class="task-panel">
      <div class="panel-head">
        <div>
          <h2>{{ activeFilterLabel }}</h2>
          <p>{{ copy('任务记录来自当前生产数据库', 'Records are loaded from the live production database') }}</p>
        </div>
        <label class="search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="keyword" :placeholder="copy('搜索任务或项目…', 'Search jobs or projects…')" />
        </label>
      </div>

      <div v-if="loading" class="loading-list">
        <div v-for="index in 5" :key="index" class="task-row skeleton"></div>
      </div>

      <div v-else-if="filteredTasks.length" class="task-list">
        <article v-for="task in filteredTasks" :key="task.key" class="task-row">
          <div :class="['task-kind', task.kind]">
            <svg v-if="task.kind === 'video'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="14" height="14" rx="3"/><path d="m17 10 4-2v8l-4-2z"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
          <div class="task-main">
            <div class="task-title-line">
              <h3>{{ task.title }}</h3>
              <span :class="['status-pill', task.state]"><i></i>{{ stateLabel(task) }}</span>
            </div>
            <p>{{ task.project || copy('未关联项目', 'Unassigned project') }}</p>
            <div v-if="task.recovered" class="task-recovered">{{ copy('首次生成未完成，已通过重试成功交付。', 'The first attempt did not complete; a retry was delivered successfully.') }}</div>
            <div v-else-if="task.error" class="task-error">{{ copy('本次生成未完成，可在制作页重新提交。', 'This generation did not complete. Retry it from the production workspace.') }}</div>
          </div>
          <div class="task-provider">
            <small>{{ copy('执行引擎', 'Engine') }}</small>
            <strong>LingDrama</strong>
            <span>{{ task.kind === 'video' ? copy('动态制作', 'Motion pipeline') : copy('视觉制作', 'Visual pipeline') }}</span>
          </div>
          <div class="task-time">
            <small>{{ copy('耗时', 'Duration') }}</small>
            <strong>{{ durationLabel(task) }}</strong>
            <span>{{ formatDate(task.updatedAt) }}</span>
          </div>
          <div class="task-actions">
            <button v-if="task.dramaId" class="btn btn-sm" @click="navigateTo(`/drama/${task.dramaId}`)">{{ copy('查看项目', 'Open project') }}</button>
            <button v-if="task.url" class="btn btn-sm btn-ghost" @click="openResult(task.url)">{{ copy('查看结果', 'View result') }}</button>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-lines"><i></i><i></i><i></i></div>
        <h2>{{ copy('当前没有这类任务', 'No jobs in this view') }}</h2>
        <p>{{ copy('开始生成角色图、分镜图或视频后，执行记录会自动显示在这里。', 'Image and video generation records will appear here automatically.') }}</p>
        <button v-if="activeFilter !== 'all' || keyword" class="btn" @click="clearFilters">{{ copy('查看全部任务', 'View all jobs') }}</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { dramaAPI, imageAPI, videoAPI } from '~/composables/useApi'
import { useLingLocale } from '~/composables/useLingLocale'

const { locale } = useLingLocale()
const loading = ref(true)
const dramas = ref([])
const images = ref([])
const videos = ref([])
const activeFilter = ref('all')
const keyword = ref('')
let timer

const copy = (zh, en) => locale.value === 'en-US' ? en : zh
const valueOf = (row, snake, camel = snake) => row?.[snake] ?? row?.[camel]
const projectMap = computed(() => new Map(dramas.value.map(drama => [Number(drama.id), drama.title])))

function normalizeState(status) {
  const value = String(status || 'pending').toLowerCase()
  if (['completed', 'complete', 'succeeded', 'done', 'success'].includes(value)) return 'completed'
  if (['failed', 'error', 'cancelled', 'canceled'].includes(value)) return 'failed'
  return 'active'
}

const tasks = computed(() => {
  const normalize = (row, kind) => {
    const dramaId = Number(valueOf(row, 'drama_id', 'dramaId')) || null
    const storyboardId = Number(valueOf(row, 'storyboard_id', 'storyboardId')) || null
    const completedAt = valueOf(row, 'completed_at', 'completedAt')
    const updatedAt = completedAt || valueOf(row, 'updated_at', 'updatedAt') || valueOf(row, 'created_at', 'createdAt')
    const url = kind === 'video'
      ? valueOf(row, 'video_url', 'videoUrl') || valueOf(row, 'minio_url', 'minioUrl')
      : valueOf(row, 'image_url', 'imageUrl') || valueOf(row, 'minio_url', 'minioUrl')
    return {
      key: `${kind}-${row.id}`,
      kind,
      title: kind === 'video' ? `${copy('视频生成任务', 'Video generation')} #${row.id}` : `${copy('图像生成任务', 'Image generation')} #${row.id}`,
      dramaId,
      storyboardId,
      project: projectMap.value.get(dramaId),
      state: normalizeState(row.status),
      status: row.status,
      error: valueOf(row, 'error_msg', 'errorMsg'),
      createdAt: valueOf(row, 'created_at', 'createdAt'),
      completedAt,
      updatedAt,
      url,
    }
  }
  const normalized = [...images.value.map(row => normalize(row, 'image')), ...videos.value.map(row => normalize(row, 'video'))]
  for (const task of normalized) {
    if (task.state !== 'failed' || !task.storyboardId) continue
    const recovered = normalized.some(candidate =>
      candidate.kind === task.kind
      && candidate.dramaId === task.dramaId
      && candidate.storyboardId === task.storyboardId
      && candidate.state === 'completed'
      && new Date(candidate.updatedAt || 0).getTime() > new Date(task.updatedAt || 0).getTime()
    )
    if (recovered) {
      task.state = 'completed'
      task.recovered = true
    }
  }
  return normalized
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
})

const activeCount = computed(() => tasks.value.filter(task => task.state === 'active').length)
const completedCount = computed(() => tasks.value.filter(task => task.state === 'completed').length)
const failedCount = computed(() => tasks.value.filter(task => task.state === 'failed').length)
const filters = computed(() => [
  { value: 'all', label: copy('全部任务', 'All jobs'), count: tasks.value.length },
  { value: 'active', label: copy('进行中', 'Active'), count: activeCount.value },
  { value: 'completed', label: copy('已完成', 'Completed'), count: completedCount.value },
  { value: 'failed', label: copy('需要处理', 'Needs attention'), count: failedCount.value },
])
const activeFilterLabel = computed(() => filters.value.find(filter => filter.value === activeFilter.value)?.label || copy('全部任务', 'All jobs'))
const filteredTasks = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return tasks.value.filter(task => {
    const matchesState = activeFilter.value === 'all' || task.state === activeFilter.value
    const matchesQuery = !query || `${task.title} ${task.project || ''}`.toLowerCase().includes(query)
    return matchesState && matchesQuery
  })
})

function stateLabel(task) {
  if (task.recovered) return copy('已恢复', 'Recovered')
  return task.state === 'completed' ? copy('已完成', 'Completed') : task.state === 'failed' ? copy('需要处理', 'Needs attention') : copy('进行中', 'Active')
}

function durationLabel(task) {
  if (!task.createdAt) return '—'
  const terminalTimestamp = task.completedAt || (task.state !== 'active' ? task.updatedAt : null)
  const end = terminalTimestamp ? new Date(terminalTimestamp).getTime() : Date.now()
  const seconds = Math.max(0, Math.round((end - new Date(task.createdAt).getTime()) / 1000))
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

function formatDate(value) {
  if (!value) return copy('未知时间', 'Unknown date')
  return new Date(value).toLocaleString(locale.value === 'en-US' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openResult(url) {
  if (!import.meta.client) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function clearFilters() {
  activeFilter.value = 'all'
  keyword.value = ''
}

async function load() {
  loading.value = true
  try {
    const [dramaResult, imageResult, videoResult] = await Promise.all([dramaAPI.list(), imageAPI.list(), videoAPI.list()])
    dramas.value = dramaResult.items || []
    images.value = Array.isArray(imageResult) ? imageResult : []
    videos.value = Array.isArray(videoResult) ? videoResult : []
  } catch (error) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  load()
  timer = window.setInterval(() => { if (activeCount.value) load() }, 8000)
})
onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })
</script>

<style scoped>
.task-page { height: 100%; overflow-y: auto; padding: 36px 46px 58px; }
.task-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 28px; margin-bottom: 26px; }
.eyebrow { margin: 0 0 7px; color: var(--accent); font: 700 10px/1 var(--font-mono); letter-spacing: .18em; }
.task-hero h1 { margin: 0; font: 700 clamp(26px, 3vw, 38px)/1.08 var(--font-body); letter-spacing: -.04em; }
.task-hero p:not(.eyebrow) { max-width: 690px; margin: 10px 0 0; color: var(--text-2); font-size: 13px; }
.hero-actions { display: flex; align-items: center; gap: 10px; }
.live-indicator { display: inline-flex; align-items: center; gap: 7px; height: 34px; padding: 0 12px; border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border)); border-radius: 999px; background: var(--accent-bg); color: var(--accent); font-size: 11px; font-weight: 700; }
.live-indicator i { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 0 var(--accent-glow); animation: pulse 1.8s infinite; }
.spinning { animation: spin .8s linear infinite; }
.status-overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.overview-card { display: flex; align-items: center; gap: 12px; min-height: 88px; padding: 14px 15px; border: 1px solid var(--border); border-radius: 17px; background: var(--bg-surface); color: var(--text-2); box-shadow: var(--shadow-card); cursor: pointer; text-align: left; transition: .2s var(--ease-out); }
.overview-card:hover, .overview-card.active { transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); box-shadow: var(--shadow); }
.overview-card > svg { margin-left: auto; color: var(--text-3); }
.overview-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 11px; background: var(--bg-2); }
.overview-icon i { width: 8px; height: 8px; border-radius: 50%; background: var(--text-3); }
.overview-card.active .overview-icon i { background: var(--accent); box-shadow: 0 0 12px var(--accent-glow); }
.overview-card.completed .overview-icon i { background: var(--success); }.overview-card.failed .overview-icon i { background: var(--error); }.overview-card.active:not(.overview-card.all) .overview-icon i { background: var(--warning); }
.overview-copy { display: flex; flex-direction: column; gap: 3px; }
.overview-copy small { color: var(--text-3); font-size: 10px; }
.overview-copy strong { color: var(--text-0); font: 700 23px/1 var(--font-mono); }
.task-panel { overflow: hidden; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-surface); box-shadow: var(--shadow-card); }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.panel-head h2 { margin: 0; font: 650 15px var(--font-body); }.panel-head p { margin: 3px 0 0; color: var(--text-3); font-size: 10px; }
.search-box { width: min(320px, 36vw); display: flex; align-items: center; gap: 8px; padding: 0 11px; border: 1px solid var(--border); border-radius: 10px; background: var(--bg-input); color: var(--text-3); }
.search-box input { width: 100%; height: 34px; border: 0; outline: 0; background: transparent; color: var(--text-0); font: 11px var(--font-body); }
.task-list { display: flex; flex-direction: column; }
.task-row { min-height: 88px; display: grid; grid-template-columns: 42px minmax(220px, 1.5fr) minmax(120px, .7fr) minmax(100px, .55fr) auto; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--border); }
.task-row:last-child { border-bottom: 0; }.task-row:hover:not(.skeleton) { background: var(--bg-hover); }
.task-kind { width: 38px; height: 38px; display: grid; place-items: center; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-2); color: var(--text-2); }
.task-kind.video { background: var(--accent-bg); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 25%, var(--border)); }
.task-title-line { display: flex; align-items: center; gap: 9px; }.task-title-line h3 { font: 650 12px var(--font-body); }
.task-main > p { margin: 5px 0 0; color: var(--text-3); font-size: 10px; }
.task-error, .task-recovered { max-width: 520px; margin-top: 7px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; }
.task-error { color: var(--error); }.task-recovered { color: var(--success); }
.status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 3px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; }
.status-pill i { width: 5px; height: 5px; border-radius: 50%; }.status-pill.completed { background: var(--success-bg); color: var(--success); }.status-pill.completed i { background: var(--success); }.status-pill.active { background: var(--warning-bg); color: var(--warning); }.status-pill.active i { background: var(--warning); }.status-pill.failed { background: var(--error-bg); color: var(--error); }.status-pill.failed i { background: var(--error); }
.task-provider, .task-time { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.task-provider small, .task-time small { color: var(--text-3); font-size: 9px; }.task-provider strong, .task-time strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-1); font: 600 11px var(--font-body); }.task-provider span, .task-time span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-3); font: 500 9px var(--font-mono); }
.task-actions { display: flex; align-items: center; justify-content: flex-end; gap: 5px; }
.task-row.skeleton { height: 88px; grid-template-columns: 1fr; background: linear-gradient(100deg, var(--bg-2) 20%, var(--bg-hover) 45%, var(--bg-2) 70%); background-size: 220% 100%; animation: shimmer 1.35s infinite; }
.empty-state { min-height: 310px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }.empty-state h2 { margin: 17px 0 3px; font: 650 16px var(--font-body); }.empty-state p { max-width: 450px; margin: 0 18px 17px; color: var(--text-2); font-size: 11px; }
.empty-lines { width: 70px; display: flex; flex-direction: column; gap: 7px; }.empty-lines i { height: 3px; border-radius: 99px; background: var(--bg-3); }.empty-lines i:nth-child(2) { width: 76%; background: var(--accent); }.empty-lines i:nth-child(3) { width: 48%; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -20% 0; } }@keyframes pulse { 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
@media (max-width: 1040px) { .task-page { padding: 28px 22px 44px; } .status-overview { grid-template-columns: repeat(2, 1fr); } .task-row { grid-template-columns: 42px minmax(200px, 1fr) minmax(110px, .6fr) auto; }.task-time { display: none; } }
@media (max-width: 720px) { .task-hero { align-items: flex-start; flex-direction: column; }.panel-head { align-items: stretch; flex-direction: column; }.search-box { width: 100%; }.task-row { grid-template-columns: 38px 1fr auto; }.task-provider { display: none; }.task-actions { grid-column: 2 / -1; justify-content: flex-start; }.hero-actions { width: 100%; justify-content: space-between; } }
</style>
