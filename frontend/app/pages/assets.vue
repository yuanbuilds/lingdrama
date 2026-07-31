<template>
  <div class="asset-page">
    <section class="asset-hero">
      <div>
        <p class="eyebrow">LINGDRAMA · ASSET LIBRARY</p>
        <h1>{{ copy('资产中心', 'Asset Library') }}</h1>
        <p class="hero-copy">{{ copy('集中查看项目中已经生成的角色、场景、镜头图与视频素材。', 'Review generated characters, scenes, shot images, and video assets across every project.') }}</p>
      </div>
      <button class="btn refresh-button" :disabled="loading" @click="load">
        <svg :class="{ spinning: loading }" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
        {{ copy('刷新素材', 'Refresh assets') }}
      </button>
    </section>

    <section class="stat-grid" aria-label="Asset summary">
      <article class="stat-card">
        <span class="stat-kicker">{{ copy('全部素材', 'All assets') }}</span>
        <strong>{{ assets.length }}</strong>
        <span>{{ copy('生产记录', 'generation records') }}</span>
      </article>
      <article class="stat-card">
        <span class="stat-kicker">{{ copy('视觉资产', 'Visual assets') }}</span>
        <strong>{{ imageCount }}</strong>
        <span>{{ copy('角色、场景与镜头', 'characters, scenes, and shots') }}</span>
      </article>
      <article class="stat-card">
        <span class="stat-kicker">{{ copy('动态镜头', 'Motion shots') }}</span>
        <strong>{{ videoCount }}</strong>
        <span>{{ copy('已生成的动态镜头', 'generated motion clips') }}</span>
      </article>
      <article class="stat-card highlight">
        <span class="stat-kicker">{{ copy('可用素材', 'Ready to use') }}</span>
        <strong>{{ readyCount }}</strong>
        <span>{{ copy('可直接进入制作', 'available for production') }}</span>
      </article>
    </section>

    <section class="asset-toolbar">
      <div class="filter-tabs">
        <button v-for="filter in filters" :key="filter.value" :class="{ active: activeFilter === filter.value }" @click="activeFilter = filter.value">
          {{ filter.label }}
          <span>{{ filter.count }}</span>
        </button>
      </div>
      <label class="search-box">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="keyword" :placeholder="copy('搜索项目、角色或素材…', 'Search projects, characters, or assets…')" />
      </label>
    </section>

    <section v-if="loading" class="asset-grid" aria-busy="true">
      <div v-for="index in 8" :key="index" class="asset-card skeleton"></div>
    </section>

    <section v-else-if="filteredAssets.length" class="asset-grid">
      <article v-for="asset in filteredAssets" :key="asset.key" class="asset-card">
        <button class="media-frame" :disabled="!asset.url" @click="openAsset(asset)">
          <img v-if="asset.kind !== 'video' && asset.url" :src="asset.url" :alt="asset.title" loading="lazy" />
          <video v-else-if="asset.url" :src="asset.url" muted preload="metadata"></video>
          <div v-else class="media-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/></svg>
            <span>{{ copy('等待生成', 'Awaiting generation') }}</span>
          </div>
          <span class="type-pill">{{ kindLabel(asset.kind) }}</span>
          <span v-if="asset.kind === 'video' && asset.url" class="play-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>
          </span>
        </button>
        <div class="asset-body">
          <div class="asset-title-row">
            <h2>{{ asset.title }}</h2>
            <span :class="['status-dot', statusTone(asset.status)]"></span>
          </div>
          <p>{{ asset.project || copy('未关联项目', 'Unassigned project') }}</p>
          <div class="asset-meta">
            <span>{{ formatDate(asset.updatedAt) }}</span>
            <span>LingDrama</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="empty-state">
      <div class="empty-orbit"><span></span></div>
      <h2>{{ copy('还没有符合条件的素材', 'No matching assets yet') }}</h2>
      <p>{{ copy('完成角色图、场景图或镜头视频生成后，素材会自动出现在这里。', 'Generated character, scene, shot, and video assets will appear here automatically.') }}</p>
      <button v-if="keyword || activeFilter !== 'all'" class="btn" @click="resetFilters">{{ copy('清除筛选', 'Clear filters') }}</button>
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
const imageRecords = ref([])
const videoRecords = ref([])
const activeFilter = ref('all')
const keyword = ref('')

const copy = (zh, en) => locale.value === 'en-US' ? en : zh
const valueOf = (row, snake, camel = snake) => row?.[snake] ?? row?.[camel]
const readyStates = new Set(['completed', 'complete', 'succeeded', 'done', 'success'])

function isReadyResult(status, url) {
  return Boolean(url) && readyStates.has(String(status || '').toLowerCase())
}

const projectMap = computed(() => new Map(dramas.value.map(drama => [Number(drama.id), drama.title])))

function mediaUrl(row, type) {
  if (type === 'video') return valueOf(row, 'video_url', 'videoUrl') || valueOf(row, 'minio_url', 'minioUrl') || ''
  return valueOf(row, 'image_url', 'imageUrl') || valueOf(row, 'minio_url', 'minioUrl') || valueOf(row, 'local_path', 'localPath') || ''
}

const assets = computed(() => {
  const rows = []
  const seen = new Set()
  const add = (asset) => {
    const signature = `${asset.kind}:${asset.url || asset.key}`
    if (seen.has(signature)) return
    seen.add(signature)
    rows.push(asset)
  }

  for (const drama of dramas.value) {
    for (const character of drama.characters || []) {
      const url = valueOf(character, 'image_url', 'imageUrl') || valueOf(character, 'local_path', 'localPath') || ''
      if (!url) continue
      add({ key: `character-${character.id}`, kind: 'character', title: character.name || copy('未命名角色', 'Untitled character'), project: drama.title, dramaId: drama.id, url, status: 'completed', updatedAt: valueOf(character, 'updated_at', 'updatedAt') })
    }
    for (const scene of drama.scenes || []) {
      const url = valueOf(scene, 'image_url', 'imageUrl') || valueOf(scene, 'local_path', 'localPath') || ''
      if (!url) continue
      add({ key: `scene-${scene.id}`, kind: 'scene', title: scene.location || copy('未命名场景', 'Untitled scene'), project: drama.title, dramaId: drama.id, url, status: scene.status || 'completed', updatedAt: valueOf(scene, 'updated_at', 'updatedAt') })
    }
  }

  for (const image of imageRecords.value) {
    const dramaId = Number(valueOf(image, 'drama_id', 'dramaId'))
    const imageType = valueOf(image, 'image_type', 'imageType')
    const url = mediaUrl(image, 'image')
    const status = image.status || 'pending'
    if (!isReadyResult(status, url)) continue
    add({
      key: `image-${image.id}`,
      kind: imageType === 'character' ? 'character' : imageType === 'scene' ? 'scene' : 'image',
      title: imageType ? `${kindLabel(imageType)} #${image.id}` : `${copy('镜头图', 'Shot image')} #${image.id}`,
      project: projectMap.value.get(dramaId), dramaId,
      url, status,
      updatedAt: valueOf(image, 'completed_at', 'completedAt') || valueOf(image, 'updated_at', 'updatedAt'),
    })
  }

  for (const video of videoRecords.value) {
    const dramaId = Number(valueOf(video, 'drama_id', 'dramaId'))
    const url = mediaUrl(video, 'video')
    const status = video.status || 'pending'
    if (!isReadyResult(status, url)) continue
    add({
      key: `video-${video.id}`, kind: 'video', title: `${copy('生成镜头', 'Generated shot')} #${video.id}`,
      project: projectMap.value.get(dramaId), dramaId, url, status,
      updatedAt: valueOf(video, 'completed_at', 'completedAt') || valueOf(video, 'updated_at', 'updatedAt'),
    })
  }

  return rows.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
})

const imageCount = computed(() => assets.value.filter(asset => asset.kind !== 'video').length)
const videoCount = computed(() => assets.value.filter(asset => asset.kind === 'video').length)
const readyCount = computed(() => assets.value.length)

const filters = computed(() => [
  { value: 'all', label: copy('全部', 'All'), count: assets.value.length },
  { value: 'character', label: copy('角色', 'Characters'), count: assets.value.filter(asset => asset.kind === 'character').length },
  { value: 'scene', label: copy('场景', 'Scenes'), count: assets.value.filter(asset => asset.kind === 'scene').length },
  { value: 'image', label: copy('镜头图', 'Shot images'), count: assets.value.filter(asset => asset.kind === 'image').length },
  { value: 'video', label: copy('视频', 'Videos'), count: videoCount.value },
])

const filteredAssets = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return assets.value.filter(asset => {
    const matchesType = activeFilter.value === 'all' || asset.kind === activeFilter.value
    const matchesQuery = !query || `${asset.title} ${asset.project || ''}`.toLowerCase().includes(query)
    return matchesType && matchesQuery
  })
})

function kindLabel(kind) {
  const labels = {
    character: copy('角色', 'Character'), scene: copy('场景', 'Scene'), image: copy('镜头图', 'Shot image'), video: copy('视频', 'Video'),
  }
  return labels[kind] || copy('素材', 'Asset')
}

function statusTone(status) {
  const value = String(status || '').toLowerCase()
  if (['completed', 'complete', 'succeeded', 'done'].includes(value)) return 'ready'
  if (['failed', 'error'].includes(value)) return 'failed'
  return 'working'
}

function formatDate(value) {
  if (!value) return copy('未知时间', 'Unknown date')
  return new Date(value).toLocaleDateString(locale.value === 'en-US' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' })
}

function openAsset(asset) {
  if (!asset.url || !import.meta.client) return
  window.open(asset.url, '_blank', 'noopener,noreferrer')
}

function resetFilters() {
  keyword.value = ''
  activeFilter.value = 'all'
}

async function load() {
  loading.value = true
  try {
    const [dramaResult, images, videos] = await Promise.all([dramaAPI.list(), imageAPI.list(), videoAPI.list()])
    dramas.value = dramaResult.items || []
    imageRecords.value = Array.isArray(images) ? images : []
    videoRecords.value = Array.isArray(videos) ? videos : []
  } catch (error) {
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.asset-page { height: 100%; overflow-y: auto; padding: 36px 46px 56px; }
.asset-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 26px; }
.eyebrow { margin: 0 0 7px; font: 700 10px/1 var(--font-mono); letter-spacing: .18em; color: var(--accent); }
.asset-hero h1 { margin: 0; font: 700 clamp(26px, 3vw, 38px)/1.08 var(--font-body); letter-spacing: -.04em; }
.hero-copy { max-width: 680px; margin: 10px 0 0; color: var(--text-2); font-size: 13px; }
.refresh-button svg.spinning { animation: spin .8s linear infinite; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 22px; }
.stat-card { min-height: 128px; padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: var(--bg-surface); box-shadow: var(--shadow-card); display: flex; flex-direction: column; }
.stat-card.highlight { background: linear-gradient(145deg, color-mix(in srgb, var(--accent) 18%, var(--bg-1)), var(--bg-surface)); border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); }
.stat-kicker { color: var(--text-3); font-size: 11px; letter-spacing: .05em; }
.stat-card strong { margin-top: auto; font: 700 30px/1 var(--font-mono); color: var(--text-0); }
.stat-card > span:last-child { margin-top: 7px; color: var(--text-3); font-size: 11px; }
.asset-toolbar { position: sticky; top: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0 -4px 18px; padding: 10px 4px; background: color-mix(in srgb, var(--bg-base) 88%, transparent); backdrop-filter: blur(16px); }
.filter-tabs { display: flex; flex-wrap: wrap; gap: 7px; }
.filter-tabs button { border: 1px solid var(--border); border-radius: 999px; background: var(--bg-surface); color: var(--text-2); padding: 7px 11px; font: 600 12px var(--font-body); cursor: pointer; }
.filter-tabs button span { margin-left: 5px; color: var(--text-3); font: 500 10px var(--font-mono); }
.filter-tabs button.active { background: var(--accent-bg); color: var(--accent); border-color: color-mix(in srgb, var(--accent) 38%, var(--border)); }
.search-box { width: min(320px, 35vw); display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 11px; background: var(--bg-input); color: var(--text-3); padding: 0 12px; }
.search-box input { width: 100%; height: 36px; border: 0; outline: 0; color: var(--text-0); background: transparent; font: 12px var(--font-body); }
.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(235px, 1fr)); gap: 15px; }
.asset-card { overflow: hidden; border: 1px solid var(--border); border-radius: 17px; background: var(--bg-surface); box-shadow: var(--shadow-card); transition: transform .22s var(--ease-out), border-color .22s, box-shadow .22s; }
.asset-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); box-shadow: var(--shadow-lg); }
.asset-card.skeleton { min-height: 270px; background: linear-gradient(100deg, var(--bg-2) 20%, var(--bg-hover) 45%, var(--bg-2) 70%); background-size: 220% 100%; animation: shimmer 1.35s infinite; }
.media-frame { position: relative; display: block; width: 100%; aspect-ratio: 16/10; overflow: hidden; border: 0; background: var(--bg-2); cursor: pointer; }
.media-frame:disabled { cursor: default; }
.media-frame img, .media-frame video { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .45s var(--ease-out); }
.asset-card:hover .media-frame img, .asset-card:hover .media-frame video { transform: scale(1.025); }
.media-empty { height: 100%; display: grid; place-content: center; justify-items: center; gap: 8px; color: var(--text-3); font-size: 11px; background: radial-gradient(circle at 50% 10%, var(--accent-bg), transparent 55%); }
.type-pill { position: absolute; left: 10px; top: 10px; padding: 4px 8px; border: 1px solid rgba(255,255,255,.18); border-radius: 999px; background: rgba(8,12,22,.68); color: #f5f8ff; backdrop-filter: blur(9px); font-size: 10px; font-weight: 700; }
.play-mark { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%, -50%); width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: rgba(8,12,22,.65); color: white; backdrop-filter: blur(10px); }
.asset-body { padding: 13px 14px 14px; }
.asset-title-row { display: flex; align-items: center; gap: 8px; }
.asset-title-row h2 { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 650 13px var(--font-body); }
.status-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 auto; }
.status-dot.ready { background: var(--success); box-shadow: 0 0 0 4px var(--success-bg); }
.status-dot.failed { background: var(--error); box-shadow: 0 0 0 4px var(--error-bg); }
.status-dot.working { background: var(--warning); box-shadow: 0 0 0 4px var(--warning-bg); }
.asset-body > p { margin: 5px 0 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-2); font-size: 11px; }
.asset-meta { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 9px; border-top: 1px solid var(--border); color: var(--text-3); font: 500 10px var(--font-mono); }
.empty-state { min-height: 340px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px dashed var(--border); border-radius: 22px; background: var(--bg-surface); }
.empty-state h2 { margin: 18px 0 3px; font: 650 17px var(--font-body); }
.empty-state p { max-width: 470px; margin: 0 20px 18px; color: var(--text-2); font-size: 12px; }
.empty-orbit { width: 62px; height: 62px; border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); border-radius: 50%; display: grid; place-items: center; animation: spin 9s linear infinite; }
.empty-orbit span { width: 9px; height: 9px; border-radius: 50%; background: var(--accent); transform: translateX(30px); box-shadow: 0 0 18px var(--accent); }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -20% 0; } }
@media (max-width: 920px) { .asset-page { padding: 28px 22px 44px; } .stat-grid { grid-template-columns: repeat(2, 1fr); } .asset-toolbar { align-items: stretch; flex-direction: column; } .search-box { width: 100%; } }
@media (max-width: 560px) { .asset-hero { align-items: flex-start; flex-direction: column; } .stat-grid { grid-template-columns: 1fr 1fr; } .stat-card { min-height: 110px; padding: 14px; } .asset-grid { grid-template-columns: 1fr; } }
</style>
