<template>
  <div class="command-page">
    <div v-if="loading" class="loading-state" aria-live="polite">
      <div class="loading-orbit"><span></span></div>
      <div>
        <strong>{{ copy.loading }}</strong>
        <p>{{ copy.loadingHint }}</p>
      </div>
    </div>

    <div v-else-if="drama" class="command-shell">
      <header class="topbar">
        <button class="ghost-btn back-btn" @click="navigateTo('/')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
          {{ copy.back }}
        </button>
        <div class="breadcrumb">
          <span>LINGDRAMA</span>
          <i></i>
          <strong>{{ copy.commandCenter }}</strong>
        </div>
        <div class="top-actions">
          <button class="ghost-btn" @click="openEditProject">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            {{ copy.editProject }}
          </button>
          <button class="primary-btn" @click="openAddEpisode">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            {{ copy.newEpisode }}
          </button>
        </div>
      </header>

      <main>
        <section class="hero-panel">
          <div class="hero-glow hero-glow-one"></div>
          <div class="hero-glow hero-glow-two"></div>
          <div class="hero-copy">
            <div class="eyebrow-row">
              <span class="live-chip"><i></i>{{ copy.productionOnline }}</span>
              <span v-if="drama.genre" class="outline-chip">{{ drama.genre }}</span>
              <span v-if="drama.style" class="outline-chip">{{ drama.style }}</span>
            </div>
            <p class="hero-kicker">{{ copy.aiProduction }}</p>
            <h1>{{ drama.title }}</h1>
            <p class="hero-description">{{ drama.description || copy.noDescription }}</p>
            <div v-if="drama.tags?.length" class="tag-row">
              <span v-for="tag in drama.tags" :key="tag"># {{ tag }}</span>
            </div>
            <div class="hero-actions">
              <button v-if="continueEpisode" class="primary-btn primary-btn-large" @click="enterEpisode(continueEpisode)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>
                {{ hasAnyProduction ? copy.continueProduction : copy.startProduction }}
              </button>
              <a v-if="latestDelivery" class="ghost-btn hero-secondary" href="#delivery">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14H3V5a2 2 0 0 1 2-2Z"/><path d="m10 8 5 3-5 3Z"/></svg>
                {{ copy.watchLatest }}
              </a>
            </div>
            <div class="metric-strip">
              <div>
                <strong>{{ episodes.length }}</strong>
                <span>{{ copy.episodes }}</span>
              </div>
              <div>
                <strong>{{ productionSummary.shots }}</strong>
                <span>{{ copy.shots }}</span>
              </div>
              <div>
                <strong>{{ totalDurationLabel }}</strong>
                <span>{{ copy.runtime }}</span>
              </div>
              <div>
                <strong>{{ completedEpisodes }}</strong>
                <span>{{ copy.delivered }}</span>
              </div>
            </div>
          </div>

          <div class="hero-visual">
            <video
              v-if="heroVideo"
              :src="heroVideo"
              :poster="heroPoster"
              muted
              loop
              playsinline
              preload="metadata"
              @mouseenter="playPreview"
              @mouseleave="pausePreview"
            ></video>
            <img v-else-if="heroPoster" :src="heroPoster" :alt="drama.title" />
            <div v-else class="hero-empty">
              <div class="empty-mark"><span></span><span></span><span></span></div>
              <strong>{{ copy.visualWaiting }}</strong>
              <p>{{ copy.visualWaitingHint }}</p>
            </div>
            <div class="visual-shade"></div>
            <div class="visual-topline">
              <span>{{ latestDelivery ? copy.latestMaster : copy.projectCanvas }}</span>
              <span v-if="latestDelivery" class="quality-chip">HD</span>
            </div>
            <div class="visual-caption">
              <div>
                <span>{{ latestDeliveryEpisodeLabel }}</span>
                <strong>{{ latestDeliveryTitle }}</strong>
              </div>
              <a v-if="latestDelivery?.merged_url" :href="mediaUrl(latestDelivery.merged_url)" target="_blank" rel="noopener" class="round-play" :aria-label="copy.openVideo">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 9 6-9 6Z"/></svg>
              </a>
            </div>
          </div>
        </section>

        <div class="dashboard-grid">
          <section class="surface episode-section">
            <div class="section-head">
              <div>
                <span class="section-kicker">{{ copy.productionMap }}</span>
                <h2>{{ copy.episodePipeline }}</h2>
              </div>
              <button class="text-btn" @click="openAddEpisode">
                {{ copy.addEpisode }}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
              </button>
            </div>

            <div v-if="episodes.length" class="episode-list">
              <article
                v-for="ep in episodes"
                :key="ep.id"
                class="episode-card"
                tabindex="0"
                @click="enterEpisode(ep)"
                @keydown.enter="enterEpisode(ep)"
              >
                <div class="episode-thumb">
                  <img v-if="episodePoster(ep)" :src="episodePoster(ep)" :alt="ep.title" />
                  <div v-else class="thumb-empty">E{{ padEpisode(ep) }}</div>
                  <span class="episode-index">E{{ padEpisode(ep) }}</span>
                  <span v-if="episodeMerge(ep)?.status === 'completed'" class="ready-badge">{{ copy.masterReady }}</span>
                </div>
                <div class="episode-info">
                  <div class="episode-title-row">
                    <div>
                      <h3>{{ ep.title }}</h3>
                      <p>{{ episodeSubtitle(ep) }}</p>
                    </div>
                    <span class="progress-value">{{ episodeProgress(ep) }}%</span>
                  </div>
                  <div class="progress-track"><span :style="{ width: `${episodeProgress(ep)}%` }"></span></div>
                  <div class="episode-meta">
                    <span><i class="meta-dot"></i>{{ completedStepLabel(ep) }}</span>
                    <span>{{ episodeShotCount(ep) }} {{ copy.shotsUnit }}</span>
                    <span>{{ episodeDuration(ep) }}</span>
                  </div>
                </div>
                <div class="episode-open">
                  <span>{{ copy.openStudio }}</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </article>
            </div>

            <button v-else class="episode-empty" @click="openAddEpisode">
              <span class="empty-plus">+</span>
              <strong>{{ copy.createFirst }}</strong>
              <p>{{ copy.createFirstHint }}</p>
            </button>

            <div v-if="recentShots.length" class="shot-sequence">
              <div class="shot-sequence-head">
                <div>
                  <span>{{ copy.latestSequence }}</span>
                  <strong>{{ copy.visualContinuity }}</strong>
                </div>
                <span>{{ recentShots.length }} / {{ productionSummary.shots }} {{ copy.shotsUnit }}</span>
              </div>
              <div class="shot-sequence-grid">
                <button v-for="shot in recentShots" :key="shot.id" @click="enterEpisode(shot.episode)">
                  <div>
                    <img v-if="storyboardImage(shot)" :src="storyboardImage(shot)" :alt="shot.title" />
                    <span v-else>{{ padNumber(shot.storyboard_number || shot.storyboardNumber) }}</span>
                    <i v-if="shot.composed_video_url || shot.composedVideoUrl || shot.video_url || shot.videoUrl"></i>
                  </div>
                  <strong>{{ shot.title }}</strong>
                  <small>{{ formatDuration(shot.duration || 0) }} · {{ shot.shot_type || copy.shotAssets }}</small>
                </button>
              </div>
            </div>
          </section>

          <aside class="side-stack">
            <section class="surface pulse-card">
              <div class="section-head compact">
                <div>
                  <span class="section-kicker">{{ copy.productionPulse }}</span>
                  <h2>{{ copy.readiness }}</h2>
                </div>
                <span class="pulse-dot"><i></i>{{ copy.liveData }}</span>
              </div>
              <div class="pulse-score">
                <div class="score-ring" :style="{ '--score': `${projectProgress * 3.6}deg` }">
                  <div><strong>{{ projectProgress }}</strong><span>%</span></div>
                </div>
                <div class="score-copy">
                  <strong>{{ projectStatusTitle }}</strong>
                  <p>{{ projectStatusHint }}</p>
                </div>
              </div>
              <div class="readiness-list">
                <div v-for="item in readinessItems" :key="item.key">
                  <span><i :class="item.state"></i>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </div>
              </div>
            </section>

            <section id="delivery" class="surface delivery-card">
              <div class="section-head compact">
                <div>
                  <span class="section-kicker">{{ copy.delivery }}</span>
                  <h2>{{ copy.latestOutput }}</h2>
                </div>
                <span v-if="latestDelivery" class="complete-chip">{{ copy.ready }}</span>
              </div>
              <template v-if="latestDelivery">
                <div class="delivery-preview">
                  <video :src="mediaUrl(latestDelivery.merged_url)" :poster="heroPoster" controls preload="metadata"></video>
                </div>
                <div class="delivery-meta">
                  <div><span>{{ copy.version }}</span><strong>{{ latestDelivery.title || copy.finalMaster }}</strong></div>
                  <div><span>{{ copy.duration }}</span><strong>{{ formatDuration(latestDelivery.duration || 0) }}</strong></div>
                  <div><span>{{ copy.format }}</span><strong>MP4</strong></div>
                </div>
                <a class="download-btn" :href="mediaUrl(latestDelivery.merged_url)" download>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></svg>
                  {{ copy.downloadMaster }}
                </a>
              </template>
              <div v-else class="delivery-empty">
                <div class="delivery-empty-icon"><span></span></div>
                <strong>{{ copy.noOutput }}</strong>
                <p>{{ copy.noOutputHint }}</p>
              </div>
            </section>
          </aside>
        </div>

        <section class="surface asset-section">
          <div class="section-head asset-head">
            <div>
              <span class="section-kicker">{{ copy.assetLibrary }}</span>
              <h2>{{ copy.productionAssets }}</h2>
              <p>{{ copy.assetHint }}</p>
            </div>
            <div class="asset-tabs" role="tablist">
              <button
                v-for="tab in assetTabs"
                :key="tab.key"
                :class="{ active: assetTab === tab.key }"
                role="tab"
                :aria-selected="assetTab === tab.key"
                @click="assetTab = tab.key"
              >
                {{ tab.label }} <span>{{ tab.count }}</span>
              </button>
            </div>
          </div>

          <div v-if="visibleAssets.length" class="asset-grid">
            <article v-for="item in visibleAssets" :key="`${assetTab}-${item.id}`" class="asset-card" @click="item.episode && enterEpisode(item.episode)">
              <div class="asset-media" :class="{ 'asset-media-empty': !item.image }">
                <img v-if="item.image" :src="item.image" :alt="item.title" loading="lazy" />
                <video v-else-if="item.video" :src="item.video" :poster="item.poster" muted preload="metadata"></video>
                <div v-else class="asset-placeholder">
                  <span>{{ item.initials }}</span>
                  <small>{{ copy.assetAwaiting }}</small>
                </div>
                <div class="asset-overlay"></div>
                <span class="asset-type">{{ item.type }}</span>
                <span v-if="item.ready" class="asset-ready"><i></i>{{ copy.ready }}</span>
                <span v-if="item.video" class="asset-play"><svg viewBox="0 0 24 24"><path d="m9 6 9 6-9 6Z"/></svg></span>
              </div>
              <div class="asset-copy">
                <strong>{{ item.title }}</strong>
                <p>{{ item.subtitle || copy.noAssetDescription }}</p>
                <span v-if="item.meta">{{ item.meta }}</span>
              </div>
            </article>
          </div>
          <div v-else class="asset-empty">
            <div class="asset-empty-graphic"><span></span><span></span><span></span></div>
            <strong>{{ emptyAssetCopy.title }}</strong>
            <p>{{ emptyAssetCopy.hint }}</p>
            <button v-if="continueEpisode" class="text-btn" @click="enterEpisode(continueEpisode)">{{ copy.goToStudio }} →</button>
          </div>
        </section>

        <footer class="project-footer">
          <div>
            <span>{{ copy.lastUpdated }}</span>
            <strong>{{ formatDate(drama.updated_at || drama.updatedAt) }}</strong>
          </div>
          <button class="danger-link" @click="deleteProject">{{ copy.deleteProject }}</button>
        </footer>
      </main>

      <div v-if="editDialog" class="dialog-mask" @click.self="editDialog = false">
        <div class="dialog project-dialog">
          <div class="dialog-head">
            <div>
              <span class="dialog-kicker">{{ copy.projectSettings }}</span>
              <h2>{{ copy.editProject }}</h2>
              <p>{{ copy.editProjectHint }}</p>
            </div>
            <button class="icon-close" :aria-label="copy.cancel" @click="editDialog = false">×</button>
          </div>
          <div class="form-grid">
            <label class="field field-wide">
              <span>{{ copy.projectTitle }}</span>
              <input v-model="editForm.title" class="input" />
            </label>
            <label class="field">
              <span>{{ copy.genre }}</span>
              <input v-model="editForm.genre" class="input" />
            </label>
            <label class="field">
              <span>{{ copy.visualStyle }}</span>
              <input v-model="editForm.style" class="input" />
            </label>
            <label class="field field-wide">
              <span>{{ copy.description }}</span>
              <textarea v-model="editForm.description" class="input textarea" rows="4"></textarea>
            </label>
          </div>
          <div class="dialog-foot">
            <button class="ghost-btn" @click="editDialog = false">{{ copy.cancel }}</button>
            <button class="primary-btn" :disabled="savingProject || !editForm.title.trim()" @click="saveProject">
              {{ savingProject ? copy.saving : copy.saveChanges }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="addDialog" class="dialog-mask" @click.self="addDialog = false">
        <div class="dialog episode-dialog">
          <div class="dialog-head">
            <div>
              <span class="dialog-kicker">{{ copy.episodeSetup }}</span>
              <h2>{{ copy.createEpisode }}</h2>
              <p>{{ copy.episodeSetupHint }}</p>
            </div>
            <button class="icon-close" :aria-label="copy.cancel" @click="addDialog = false">×</button>
          </div>

          <div class="config-summary">
            <span>{{ copy.image }} · {{ imageConfigs.length }}</span>
            <span>{{ copy.video }} · {{ videoConfigs.length }}</span>
            <span>{{ copy.audio }} · {{ audioConfigs.length }}</span>
          </div>

          <label class="field">
            <span>{{ copy.episodeTitle }}</span>
            <input v-model="newEpisodeTitle" class="input" :placeholder="copy.episodeTitlePlaceholder" />
          </label>

          <div class="config-grid">
            <label class="config-card">
              <small>IMAGE</small>
              <span>{{ copy.imageConfig }}</span>
              <BaseSelect v-model="newEpisodeImageConfigId" :options="imageConfigOptions" :placeholder="copy.chooseImage" searchable />
            </label>
            <label class="config-card">
              <small>VIDEO</small>
              <span>{{ copy.videoConfig }}</span>
              <BaseSelect v-model="newEpisodeVideoConfigId" :options="videoConfigOptions" :placeholder="copy.chooseVideo" searchable />
            </label>
            <label class="config-card">
              <small>AUDIO</small>
              <span>{{ copy.audioConfig }}</span>
              <BaseSelect v-model="newEpisodeAudioConfigId" :options="audioConfigOptions" :placeholder="copy.chooseAudio" searchable />
            </label>
          </div>

          <div class="dialog-foot split-foot">
            <p>{{ copy.configLocked }}</p>
            <div>
              <button class="ghost-btn" @click="addDialog = false">{{ copy.cancel }}</button>
              <button class="primary-btn" :disabled="creatingEpisode || !canCreateEpisode" @click="addEpisode">
                {{ creatingEpisode ? copy.creating : copy.createAndOpen }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="loading-state error-state">
      <strong>{{ copy.loadFailed }}</strong>
      <button class="primary-btn" @click="load">{{ copy.retry }}</button>
    </div>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { aiConfigAPI, dramaAPI, episodeAPI, imageAPI, mergeAPI } from '~/composables/useApi'

const route = useRoute()
const { locale } = useLingLocale()
const dramaId = Number(route.params.id)

const loading = ref(true)
const drama = ref(null)
const projectImages = ref([])
const episodeData = ref({})
const assetTab = ref('characters')
const addDialog = ref(false)
const editDialog = ref(false)
const creatingEpisode = ref(false)
const savingProject = ref(false)
const newEpisodeTitle = ref('')
const imageConfigs = ref([])
const videoConfigs = ref([])
const audioConfigs = ref([])
const newEpisodeImageConfigId = ref(null)
const newEpisodeVideoConfigId = ref(null)
const newEpisodeAudioConfigId = ref(null)
const editForm = reactive({ title: '', genre: '', style: '', description: '' })

const messages = {
  'zh-CN': {
    loading: '正在同步制作现场', loadingHint: '汇总剧集、资产与交付状态…', back: '项目中心', commandCenter: '项目指挥中心', editProject: '编辑项目', newEpisode: '新建剧集',
    productionOnline: '制作空间在线', aiProduction: 'AI CINEMATIC PRODUCTION', noDescription: '这个项目还没有简介，可在项目设置中补充创作方向。', continueProduction: '继续制作', startProduction: '开始制作', watchLatest: '查看最新成片',
    episodes: '剧集', shots: '分镜', runtime: '成片时长', delivered: '已交付', latestMaster: 'LATEST MASTER', projectCanvas: 'PROJECT CANVAS', visualWaiting: '等待首个视觉镜头', visualWaitingHint: '进入剧集工作台生成分镜画面后，这里会自动更新。', openVideo: '打开成片',
    productionMap: 'PRODUCTION MAP', episodePipeline: '剧集制作进度', addEpisode: '添加一集', masterReady: '成片就绪', shotsUnit: '镜头', openStudio: '进入工作台', createFirst: '创建第一集', createFirstHint: '从故事梗概开始建立这个项目的第一条生产线。', latestSequence: 'LATEST SEQUENCE', visualContinuity: '最近镜头序列',
    scriptReady: '剧本已就绪', waitingForScript: '等待剧本', noEpisodeDescription: '尚未填写本集简介', completedSteps: '项流程已完成', coreMasterComplete: '核心成片已完成',
    productionPulse: 'PRODUCTION PULSE', readiness: '制作就绪度', liveData: '实时数据', projectDelivered: '已有成片可交付', projectInProgress: '项目正在制作中', projectNotStarted: '等待启动制作', deliveredHint: '成片与源资产均可继续回看和迭代。', inProgressHint: '生产数据已同步，可从未完成的剧集继续。', notStartedHint: '创建或进入剧集，即可启动内容生产。',
    story: '剧本', characters: '角色', scenes: '场景', storyboard: '分镜', videoShots: '视频镜头', ready: '已就绪', notReady: '待创建',
    delivery: 'DELIVERY', latestOutput: '最新交付', version: '版本', duration: '时长', format: '格式', finalMaster: '最终成片', downloadMaster: '下载成片', noOutput: '尚无可交付成片', noOutputHint: '镜头合成完成后，最终成片会自动出现在这里。',
    assetLibrary: 'ASSET LIBRARY', productionAssets: '项目资产', assetHint: '所有内容均与当前项目的生产数据保持同步。', assetAwaiting: '设定已就绪', noAssetDescription: '暂无资产说明', goToStudio: '前往制作工作台',
    characterAssets: '角色', sceneAssets: '场景', shotAssets: '分镜', videoAssets: '视频', characterEmpty: '角色资产尚未建立', characterEmptyHint: '解析剧本后，角色及其视觉设定会显示在这里。', sceneEmpty: '场景资产尚未建立', sceneEmptyHint: '解析剧本并生成场景后，场景画面会显示在这里。', shotEmpty: '还没有分镜资产', shotEmptyHint: '在剧集工作台完成分镜拆解后即可查看。', videoEmpty: '还没有视频镜头', videoEmptyHint: '生成视频后，每个镜头都会在这里出现。',
    lastUpdated: '项目最近更新', deleteProject: '删除项目', projectSettings: 'PROJECT SETTINGS', editProjectHint: '更新客户在项目空间中看到的基础信息。', projectTitle: '项目名称', genre: '题材', visualStyle: '视觉风格', description: '项目简介', cancel: '取消', saving: '保存中…', saveChanges: '保存修改',
    episodeSetup: 'EPISODE SETUP', createEpisode: '创建新剧集', episodeSetupHint: '为本集锁定图片、视频与音频生成服务。', image: '图片服务', video: '视频服务', audio: '音频服务', episodeTitle: '剧集名称', episodeTitlePlaceholder: '留空将按集数自动命名', imageConfig: '图片配置', videoConfig: '视频配置', audioConfig: '音频配置', chooseImage: '选择图片服务', chooseVideo: '选择视频服务', chooseAudio: '选择音频服务', configLocked: '这些生成配置创建后将跟随当前剧集。', creating: '创建中…', createAndOpen: '创建剧集',
    projectSaved: '项目信息已更新', saveFailed: '保存失败', episodeCreated: '新剧集已创建', deleteConfirm: '确定删除这个项目吗？项目将从项目中心移除。', projectDeleted: '项目已删除', loadFailed: '项目数据加载失败', retry: '重新加载', unknownDate: '暂无记录', episodeLabel: '第 {n} 集',
  },
  'en-US': {
    loading: 'Syncing production workspace', loadingHint: 'Collecting episodes, assets and delivery status…', back: 'Projects', commandCenter: 'Project Command', editProject: 'Edit project', newEpisode: 'New episode',
    productionOnline: 'Production space online', aiProduction: 'AI CINEMATIC PRODUCTION', noDescription: 'No project description yet. Add the creative direction in project settings.', continueProduction: 'Continue production', startProduction: 'Start production', watchLatest: 'Watch latest master',
    episodes: 'Episodes', shots: 'Shots', runtime: 'Master runtime', delivered: 'Delivered', latestMaster: 'LATEST MASTER', projectCanvas: 'PROJECT CANVAS', visualWaiting: 'Waiting for the first visual', visualWaitingHint: 'Generated storyboard frames will appear here automatically.', openVideo: 'Open master video',
    productionMap: 'PRODUCTION MAP', episodePipeline: 'Episode pipeline', addEpisode: 'Add episode', masterReady: 'Master ready', shotsUnit: 'shots', openStudio: 'Open studio', createFirst: 'Create the first episode', createFirstHint: 'Start the project production line from your story outline.', latestSequence: 'LATEST SEQUENCE', visualContinuity: 'Recent shot sequence',
    scriptReady: 'Script ready', waitingForScript: 'Waiting for script', noEpisodeDescription: 'No episode description', completedSteps: 'steps completed', coreMasterComplete: 'Core master complete',
    productionPulse: 'PRODUCTION PULSE', readiness: 'Production readiness', liveData: 'Live data', projectDelivered: 'A master is ready to deliver', projectInProgress: 'Production is in progress', projectNotStarted: 'Ready to start production', deliveredHint: 'The master and source assets remain available for iteration.', inProgressHint: 'Production data is synced. Continue from any unfinished episode.', notStartedHint: 'Create or open an episode to begin production.',
    story: 'Script', characters: 'Characters', scenes: 'Scenes', storyboard: 'Storyboards', videoShots: 'Video shots', ready: 'Ready', notReady: 'Pending',
    delivery: 'DELIVERY', latestOutput: 'Latest output', version: 'Version', duration: 'Runtime', format: 'Format', finalMaster: 'Final master', downloadMaster: 'Download master', noOutput: 'No deliverable yet', noOutputHint: 'The final master will appear here after shot composition.',
    assetLibrary: 'ASSET LIBRARY', productionAssets: 'Production assets', assetHint: 'Every item is sourced directly from this project’s production data.', assetAwaiting: 'Definition ready', noAssetDescription: 'No asset description', goToStudio: 'Go to production studio',
    characterAssets: 'Characters', sceneAssets: 'Scenes', shotAssets: 'Shots', videoAssets: 'Videos', characterEmpty: 'No character assets yet', characterEmptyHint: 'Characters and visual definitions will appear after script extraction.', sceneEmpty: 'No scene assets yet', sceneEmptyHint: 'Scene visuals will appear after extraction and generation.', shotEmpty: 'No storyboard assets yet', shotEmptyHint: 'Break down an episode into shots in the production studio.', videoEmpty: 'No video shots yet', videoEmptyHint: 'Each generated video shot will appear here.',
    lastUpdated: 'Project last updated', deleteProject: 'Delete project', projectSettings: 'PROJECT SETTINGS', editProjectHint: 'Update the information clients see across the project space.', projectTitle: 'Project title', genre: 'Genre', visualStyle: 'Visual style', description: 'Description', cancel: 'Cancel', saving: 'Saving…', saveChanges: 'Save changes',
    episodeSetup: 'EPISODE SETUP', createEpisode: 'Create episode', episodeSetupHint: 'Lock image, video and audio generation services for this episode.', image: 'Image', video: 'Video', audio: 'Audio', episodeTitle: 'Episode title', episodeTitlePlaceholder: 'Leave blank to name by episode number', imageConfig: 'Image service', videoConfig: 'Video service', audioConfig: 'Audio service', chooseImage: 'Choose image service', chooseVideo: 'Choose video service', chooseAudio: 'Choose audio service', configLocked: 'These generation settings stay with this episode after creation.', creating: 'Creating…', createAndOpen: 'Create episode',
    projectSaved: 'Project information updated', saveFailed: 'Unable to save', episodeCreated: 'Episode created', deleteConfirm: 'Delete this project? It will be removed from the project center.', projectDeleted: 'Project deleted', loadFailed: 'Unable to load project data', retry: 'Try again', unknownDate: 'No record', episodeLabel: 'Episode {n}',
  },
}

const copy = computed(() => messages[locale.value] || messages['zh-CN'])
const episodes = computed(() => drama.value?.episodes || [])
const detailFor = (epId) => episodeData.value[epId] || { storyboards: [], pipeline: null, merge: null }
const allStoryboards = computed(() => {
  const detailed = episodes.value.flatMap(ep => (detailFor(ep.id).storyboards || []).map(sb => ({ ...sb, episode: ep })))
  if (detailed.length) return detailed
  return (drama.value?.storyboards || []).map(sb => ({
    ...sb,
    episode: episodes.value.find(ep => Number(ep.id) === Number(sb.episode_id || sb.episodeId)) || episodes.value[0],
  })).filter(sb => sb.episode)
})
const productionSummary = computed(() => ({
  shots: Number(drama.value?.production_summary?.shots ?? allStoryboards.value.length),
  imagesReady: Number(drama.value?.production_summary?.images_ready ?? allStoryboards.value.filter(storyboardImage).length),
  videosReady: Number(drama.value?.production_summary?.videos_ready ?? videoAssets.value.length),
  finalReady: Boolean(drama.value?.production_summary?.final_ready ?? latestDelivery.value),
}))
const completedEpisodes = computed(() => episodes.value.filter(ep => episodeMerge(ep)?.status === 'completed').length)
const hasAnyProduction = computed(() => episodes.value.some(ep => hasScript(ep) || episodeShotCount(ep) > 0))
const continueEpisode = computed(() => [...episodes.value].reverse().find(ep => episodeMerge(ep)?.status !== 'completed') || episodes.value[episodes.value.length - 1] || null)
const latestDeliveryEntry = computed(() => [...episodes.value].reverse().map(ep => ({ ep, merge: episodeMerge(ep) })).find(item => item.merge?.status === 'completed' && item.merge?.merged_url) || null)
const latestDelivery = computed(() => latestDeliveryEntry.value?.merge || null)
const latestDeliveryTitle = computed(() => latestDeliveryEntry.value?.ep?.title || copy.value.noOutput)
const latestDeliveryEpisodeLabel = computed(() => latestDeliveryEntry.value ? copy.value.episodeLabel.replace('{n}', latestDeliveryEntry.value.ep.episode_number || latestDeliveryEntry.value.ep.episodeNumber) : copy.value.projectCanvas)
const heroPoster = computed(() => {
  const projectPreview = mediaUrl(drama.value?.preview_image)
  const preferred = latestDeliveryEntry.value?.ep ? episodePoster(latestDeliveryEntry.value.ep) : ''
  return projectPreview || preferred || [...allStoryboards.value].reverse().map(storyboardImage).find(Boolean) || ''
})
const heroVideo = computed(() => mediaUrl(drama.value?.preview_video || latestDelivery.value?.merged_url))
const projectProgress = computed(() => {
  if (latestDelivery.value) return 100
  const statuses = episodes.value.flatMap(ep => Object.values(detailFor(ep.id).pipeline?.steps || {}))
  if (!statuses.length) return 0
  return Math.round(statuses.filter(step => step?.status === 'done').length / statuses.length * 100)
})
const totalDuration = computed(() => episodes.value.reduce((total, ep) => {
  const mergeDuration = Number(episodeMerge(ep)?.duration || 0)
  if (mergeDuration) return total + mergeDuration
  return total + detailFor(ep.id).storyboards.reduce((sum, sb) => sum + Number(sb.duration || 0), 0)
}, 0))
const totalDurationLabel = computed(() => formatDuration(totalDuration.value))
const projectStatusTitle = computed(() => latestDelivery.value ? copy.value.projectDelivered : (hasAnyProduction.value ? copy.value.projectInProgress : copy.value.projectNotStarted))
const projectStatusHint = computed(() => latestDelivery.value ? copy.value.deliveredHint : (hasAnyProduction.value ? copy.value.inProgressHint : copy.value.notStartedHint))

const completedImages = computed(() => projectImages.value.filter(image => image.status === 'completed' && generatedImageUrl(image)))
const generatedImageFor = (field, id) => completedImages.value.find(image => Number(image[field] ?? image[toCamel(field)]) === Number(id))
const characterImage = character => mediaUrl(character.image_url || character.local_path || generatedImageUrl(generatedImageFor('character_id', character.id)))
const sceneImage = scene => {
  const direct = scene.image_url || scene.local_path || generatedImageUrl(generatedImageFor('scene_id', scene.id))
  if (direct) return mediaUrl(direct)
  const board = allStoryboards.value.find(sb => Number(sb.scene_id || sb.sceneId) === Number(scene.id))
  return board ? storyboardImage(board) : ''
}

const characterAssets = computed(() => (drama.value?.characters || []).map(character => ({
  id: character.id, title: character.name, subtitle: character.role || character.description, meta: character.personality, image: characterImage(character), initials: initials(character.name), type: copy.value.characterAssets, ready: !!characterImage(character),
})))
const sceneAssets = computed(() => (drama.value?.scenes || []).map(scene => ({
  id: scene.id, title: scene.location || `${copy.value.sceneAssets} ${scene.id}`, subtitle: [scene.time, scene.status && scene.status !== 'pending' ? scene.status : ''].filter(Boolean).join(' · '), meta: scene.prompt, image: sceneImage(scene), initials: 'SC', type: copy.value.sceneAssets, ready: !!sceneImage(scene),
})))
const storyboardAssets = computed(() => allStoryboards.value.map(sb => ({
  id: sb.id, title: sb.title || `${copy.value.shotAssets} ${sb.storyboard_number || sb.storyboardNumber}`, subtitle: [sb.shot_type, sb.movement].filter(Boolean).join(' · '), meta: `${copy.value.episodeLabel.replace('{n}', sb.episode.episode_number || sb.episode.episodeNumber)} · ${formatDuration(sb.duration || 0)}`, image: storyboardImage(sb), initials: padNumber(sb.storyboard_number || sb.storyboardNumber), type: copy.value.shotAssets, ready: !!storyboardImage(sb), episode: sb.episode,
})))
const videoAssets = computed(() => allStoryboards.value.filter(sb => sb.composed_video_url || sb.composedVideoUrl || sb.video_url || sb.videoUrl).map(sb => ({
  id: sb.id, title: sb.title || `${copy.value.videoAssets} ${sb.storyboard_number || sb.storyboardNumber}`, subtitle: [sb.shot_type, sb.movement].filter(Boolean).join(' · '), meta: `${copy.value.episodeLabel.replace('{n}', sb.episode.episode_number || sb.episode.episodeNumber)} · ${formatDuration(sb.duration || 0)}`, video: mediaUrl(sb.composed_video_url || sb.composedVideoUrl || sb.video_url || sb.videoUrl), poster: storyboardImage(sb), initials: padNumber(sb.storyboard_number || sb.storyboardNumber), type: copy.value.videoAssets, ready: true, episode: sb.episode,
})))

const assetTabs = computed(() => [
  { key: 'characters', label: copy.value.characterAssets, count: characterAssets.value.length },
  { key: 'scenes', label: copy.value.sceneAssets, count: sceneAssets.value.length },
  { key: 'storyboards', label: copy.value.shotAssets, count: storyboardAssets.value.length },
  { key: 'videos', label: copy.value.videoAssets, count: videoAssets.value.length },
])
const assetCollections = computed(() => ({ characters: characterAssets.value, scenes: sceneAssets.value, storyboards: storyboardAssets.value, videos: videoAssets.value }))
const visibleAssets = computed(() => (assetCollections.value[assetTab.value] || []).slice(0, 8))
const recentShots = computed(() => [...allStoryboards.value].reverse().slice(0, 4).reverse())
const emptyAssetCopy = computed(() => ({
  characters: { title: copy.value.characterEmpty, hint: copy.value.characterEmptyHint },
  scenes: { title: copy.value.sceneEmpty, hint: copy.value.sceneEmptyHint },
  storyboards: { title: copy.value.shotEmpty, hint: copy.value.shotEmptyHint },
  videos: { title: copy.value.videoEmpty, hint: copy.value.videoEmptyHint },
}[assetTab.value]))

const readinessItems = computed(() => [
  { key: 'story', label: copy.value.story, value: `${episodes.value.filter(hasScript).length}/${episodes.value.length}`, state: episodes.value.some(hasScript) ? 'done' : 'pending' },
  { key: 'characters', label: copy.value.characters, value: drama.value?.characters?.length || 0, state: drama.value?.characters?.length ? 'done' : 'pending' },
  { key: 'scenes', label: copy.value.scenes, value: drama.value?.scenes?.length || 0, state: drama.value?.scenes?.length ? 'done' : 'pending' },
  { key: 'storyboards', label: copy.value.storyboard, value: productionSummary.value.shots, state: productionSummary.value.shots ? 'done' : 'pending' },
  { key: 'videos', label: copy.value.videoShots, value: productionSummary.value.videosReady, state: productionSummary.value.videosReady ? 'done' : 'pending' },
])

function hasScript(ep) { return !!(ep.script_content || ep.scriptContent) }
function toCamel(value) { return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) }
function mediaUrl(path) {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/.test(path)) return path
  return path.startsWith('/') ? path : `/${path}`
}
function generatedImageUrl(image) { return image?.localPath || image?.local_path || image?.minioUrl || image?.minio_url || image?.imageUrl || image?.image_url || '' }
function storyboardImage(sb) { return mediaUrl(sb?.composed_image || sb?.composedImage || sb?.first_frame_image || sb?.firstFrameImage || generatedImageUrl(generatedImageFor('storyboard_id', sb?.id))) }
function episodeInfo(ep) { return detailFor(ep.id) }
function episodeMerge(ep) { return episodeInfo(ep).merge || null }
function episodePoster(ep) { return episodeInfo(ep).storyboards.map(storyboardImage).find(Boolean) || mediaUrl(ep.thumbnail) }
function episodeShotCount(ep) { return episodeInfo(ep).storyboards.length }
function padNumber(value) { return String(value || 0).padStart(2, '0') }
function padEpisode(ep) { return padNumber(ep.episode_number || ep.episodeNumber) }
function initials(name) { return String(name || '').trim().slice(0, 2).toUpperCase() || 'LD' }
function episodeDuration(ep) {
  const merged = Number(episodeMerge(ep)?.duration || 0)
  const duration = merged || episodeInfo(ep).storyboards.reduce((sum, sb) => sum + Number(sb.duration || 0), 0)
  return formatDuration(duration)
}
function episodeProgress(ep) {
  if (episodeMerge(ep)?.status === 'completed') return 100
  const steps = Object.values(episodeInfo(ep).pipeline?.steps || {})
  if (!steps.length) return hasScript(ep) ? 10 : 0
  return Math.round(steps.filter(step => step?.status === 'done').length / steps.length * 100)
}
function completedStepLabel(ep) {
  if (episodeMerge(ep)?.status === 'completed') return copy.value.coreMasterComplete
  const steps = Object.values(episodeInfo(ep).pipeline?.steps || {})
  const done = steps.filter(step => step?.status === 'done').length
  return `${done}/${steps.length || 10} ${copy.value.completedSteps}`
}
function episodeSubtitle(ep) { return ep.description || (hasScript(ep) ? copy.value.scriptReady : copy.value.waitingForScript) }
function formatDuration(seconds) {
  const value = Math.max(0, Math.round(Number(seconds) || 0))
  if (value < 60) return `${value}s`
  return `${Math.floor(value / 60)}m ${value % 60}s`
}
function formatDate(value) {
  if (!value) return copy.value.unknownDate
  try { return new Intl.DateTimeFormat(locale.value, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) } catch { return copy.value.unknownDate }
}
function enterEpisode(ep) { navigateTo(`/drama/${dramaId}/episode/${ep.episode_number || ep.episodeNumber}`) }
function playPreview(event) { event.currentTarget.play?.().catch(() => {}) }
function pausePreview(event) { event.currentTarget.pause?.() }

function configLabel(config) {
  if (!config) return ''
  let modelName = ''
  if (Array.isArray(config.model)) modelName = config.model[0] || ''
  else try { const model = JSON.parse(config.model || '[]'); modelName = Array.isArray(model) ? (model[0] || '') : (model || '') } catch { modelName = config.model || '' }
  return modelName ? `${config.name} · ${modelName}` : `${config.name} · ${config.provider}`
}
const imageConfigOptions = computed(() => imageConfigs.value.map(config => ({ label: configLabel(config), value: config.id })))
const videoConfigOptions = computed(() => videoConfigs.value.map(config => ({ label: configLabel(config), value: config.id })))
const audioConfigOptions = computed(() => audioConfigs.value.map(config => ({ label: configLabel(config), value: config.id })))
const canCreateEpisode = computed(() => !!(newEpisodeImageConfigId.value && newEpisodeVideoConfigId.value && newEpisodeAudioConfigId.value))

async function load() {
  loading.value = true
  try {
    const project = await dramaAPI.get(dramaId)
    drama.value = project
    const [images, details] = await Promise.all([
      imageAPI.list({ drama_id: dramaId }).catch(() => []),
      Promise.all((project.episodes || []).map(async ep => {
        const [storyboards, pipeline, merge] = await Promise.all([
          episodeAPI.storyboards(ep.id).catch(() => []),
          episodeAPI.pipelineStatus(ep.id).catch(() => null),
          mergeAPI.status(ep.id).catch(() => null),
        ])
        return [ep.id, { storyboards: storyboards || [], pipeline, merge }]
      })),
    ])
    projectImages.value = images || []
    episodeData.value = Object.fromEntries(details)
  } catch (error) {
    drama.value = null
    toast.error(error.message)
  } finally {
    loading.value = false
  }
}

async function loadConfigs() {
  try {
    const [images, videos, audios] = await Promise.all([aiConfigAPI.list('image'), aiConfigAPI.list('video'), aiConfigAPI.list('audio')])
    imageConfigs.value = images || []
    videoConfigs.value = videos || []
    audioConfigs.value = audios || []
    if (!newEpisodeImageConfigId.value && imageConfigs.value.length) newEpisodeImageConfigId.value = imageConfigs.value[0].id
    if (!newEpisodeVideoConfigId.value && videoConfigs.value.length) newEpisodeVideoConfigId.value = videoConfigs.value[0].id
    if (!newEpisodeAudioConfigId.value && audioConfigs.value.length) newEpisodeAudioConfigId.value = audioConfigs.value[0].id
  } catch (error) {
    toast.error(error.message)
  }
}

function openAddEpisode() {
  newEpisodeTitle.value = ''
  addDialog.value = true
  if (!imageConfigs.value.length && !videoConfigs.value.length && !audioConfigs.value.length) loadConfigs()
}

async function addEpisode() {
  try {
    creatingEpisode.value = true
    const created = await episodeAPI.create({
      drama_id: dramaId,
      title: newEpisodeTitle.value || undefined,
      image_config_id: newEpisodeImageConfigId.value,
      video_config_id: newEpisodeVideoConfigId.value,
      audio_config_id: newEpisodeAudioConfigId.value,
    })
    toast.success(copy.value.episodeCreated)
    addDialog.value = false
    await load()
    const ep = episodes.value.find(item => item.id === created?.id)
    if (ep) enterEpisode(ep)
  } catch (error) {
    toast.error(error.message)
  } finally {
    creatingEpisode.value = false
  }
}

function openEditProject() {
  Object.assign(editForm, {
    title: drama.value?.title || '',
    genre: drama.value?.genre || '',
    style: drama.value?.style || '',
    description: drama.value?.description || '',
  })
  editDialog.value = true
}

async function saveProject() {
  try {
    savingProject.value = true
    await dramaAPI.update(dramaId, { ...editForm })
    Object.assign(drama.value, { ...editForm })
    editDialog.value = false
    toast.success(copy.value.projectSaved)
  } catch (error) {
    toast.error(error.message || copy.value.saveFailed)
  } finally {
    savingProject.value = false
  }
}

async function deleteProject() {
  if (!window.confirm(copy.value.deleteConfirm)) return
  try {
    await dramaAPI.del(dramaId)
    toast.success(copy.value.projectDeleted)
    navigateTo('/')
  } catch (error) {
    toast.error(error.message)
  }
}

onMounted(() => { load(); loadConfigs() })
</script>

<style scoped>
.command-page {
  --ink: #eef4ff;
  --muted: #8e9ab3;
  --muted-2: #66728c;
  --line: rgba(151, 169, 210, 0.14);
  --line-strong: rgba(103, 207, 255, 0.28);
  --panel: rgba(16, 23, 39, 0.88);
  --panel-strong: #121a2b;
  --cyan: #55d8ff;
  --blue: #6d8dff;
  --violet: #9a7cff;
  --green: #52e3ad;
  height: 100%;
  overflow-y: auto;
  color: var(--ink);
  background:
    radial-gradient(circle at 18% 2%, rgba(64, 119, 255, 0.16), transparent 30%),
    radial-gradient(circle at 90% 10%, rgba(107, 63, 207, 0.13), transparent 28%),
    linear-gradient(180deg, #080d17 0%, #0a101d 55%, #070c15 100%);
}
.command-page::before {
  content: ''; position: fixed; inset: 0; pointer-events: none; opacity: .18;
  background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, black, transparent 70%);
}
.command-shell { min-height: 100%; position: relative; z-index: 1; }
.topbar {
  height: 70px; padding: 0 clamp(20px, 4vw, 56px); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  border-bottom: 1px solid var(--line); background: rgba(8, 13, 23, .78); backdrop-filter: blur(18px); position: sticky; top: 0; z-index: 20;
}
.breadcrumb { display: flex; align-items: center; gap: 10px; color: var(--muted-2); font-size: 10px; letter-spacing: .14em; }
.breadcrumb i { width: 3px; height: 3px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 10px var(--cyan); }
.breadcrumb strong { color: var(--muted); font-size: 11px; font-weight: 600; }
.top-actions { justify-self: end; display: flex; align-items: center; gap: 10px; }
main { width: min(1480px, calc(100% - clamp(32px, 7vw, 104px))); margin: 0 auto; padding: 34px 0 54px; }
button, a { -webkit-tap-highlight-color: transparent; }
.ghost-btn, .primary-btn, .text-btn, .download-btn {
  border: 0; font: inherit; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; transition: .2s ease;
}
.ghost-btn { height: 38px; padding: 0 13px; color: #b3bfd7; border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.025); font-size: 12px; }
.ghost-btn:hover { color: white; border-color: var(--line-strong); background: rgba(77, 134, 255, .09); }
.ghost-btn svg, .primary-btn svg, .text-btn svg, .download-btn svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.primary-btn { height: 39px; padding: 0 16px; color: white; border-radius: 10px; font-size: 12px; font-weight: 700; background: linear-gradient(115deg, #5479f7, #765de5); box-shadow: 0 8px 24px rgba(70, 93, 226, .24), inset 0 1px rgba(255,255,255,.2); }
.primary-btn:hover { transform: translateY(-1px); box-shadow: 0 11px 30px rgba(70, 93, 226, .36), inset 0 1px rgba(255,255,255,.2); }
.primary-btn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
.back-btn { justify-self: start; }

.hero-panel {
  min-height: 480px; display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(440px, .92fr); position: relative; overflow: hidden;
  border: 1px solid var(--line); border-radius: 28px; background: linear-gradient(135deg, rgba(20, 30, 51, .96), rgba(11, 17, 30, .9)); box-shadow: 0 30px 90px rgba(0, 0, 0, .28);
}
.hero-panel::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 1px rgba(255,255,255,.045); }
.hero-glow { position: absolute; border-radius: 50%; filter: blur(12px); pointer-events: none; }
.hero-glow-one { width: 390px; height: 390px; left: -170px; top: -210px; background: rgba(51, 119, 255, .25); }
.hero-glow-two { width: 320px; height: 320px; left: 38%; bottom: -270px; background: rgba(132, 72, 255, .15); }
.hero-copy { padding: clamp(42px, 5vw, 72px); position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; }
.eyebrow-row, .tag-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.live-chip, .outline-chip { height: 25px; display: inline-flex; align-items: center; padding: 0 9px; border-radius: 999px; font-size: 9px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.live-chip { color: #9bf4d3; background: rgba(63, 214, 161, .09); border: 1px solid rgba(82, 227, 173, .18); }
.live-chip i { width: 5px; height: 5px; margin-right: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 9px var(--green); }
.outline-chip { color: #a8b5ce; border: 1px solid var(--line); background: rgba(255,255,255,.02); }
.hero-kicker { margin: 28px 0 10px; font-size: 10px; font-weight: 700; letter-spacing: .24em; color: var(--cyan); }
.hero-copy h1 { margin: 0; max-width: 720px; font-size: clamp(38px, 4.2vw, 68px); line-height: 1.03; letter-spacing: -.05em; font-weight: 780; text-wrap: balance; }
.hero-description { max-width: 650px; margin: 20px 0 0; color: #9aa7c1; line-height: 1.75; font-size: 14px; }
.tag-row { margin-top: 13px; }
.tag-row span { color: #71809e; font-size: 11px; }
.hero-actions { display: flex; gap: 10px; margin-top: 29px; }
.primary-btn-large { height: 45px; padding: 0 20px; font-size: 13px; }
.hero-secondary { height: 45px; padding: 0 18px; }
.metric-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 43px; padding-top: 22px; border-top: 1px solid var(--line); }
.metric-strip > div { display: flex; flex-direction: column; gap: 5px; padding: 0 18px; border-right: 1px solid var(--line); }
.metric-strip > div:first-child { padding-left: 0; }.metric-strip > div:last-child { border-right: 0; }
.metric-strip strong { font-size: 20px; letter-spacing: -.02em; }.metric-strip span { font-size: 10px; color: var(--muted-2); text-transform: uppercase; letter-spacing: .07em; }
.hero-visual { position: relative; min-height: 420px; margin: 18px 18px 18px 0; overflow: hidden; border-radius: 21px; background: #060a12; border: 1px solid rgba(255,255,255,.06); }
.hero-visual > video, .hero-visual > img { width: 100%; height: 100%; object-fit: cover; position: absolute; inset: 0; }
.visual-shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(4,8,16,.45), transparent 32%, rgba(4,8,16,.86)); pointer-events: none; }
.visual-topline, .visual-caption { position: absolute; left: 22px; right: 22px; display: flex; justify-content: space-between; align-items: center; z-index: 2; }
.visual-topline { top: 20px; font-size: 9px; letter-spacing: .14em; color: rgba(255,255,255,.72); }
.quality-chip { padding: 4px 7px; border-radius: 6px; color: #b7f0ff; background: rgba(21, 184, 236, .13); border: 1px solid rgba(86, 215, 255, .2); }
.visual-caption { bottom: 21px; }.visual-caption > div { display: flex; flex-direction: column; gap: 4px; min-width: 0; }.visual-caption span { font-size: 10px; color: rgba(255,255,255,.55); }.visual-caption strong { max-width: 360px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 16px; }
.round-play { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; color: #07101c; background: rgba(255,255,255,.9); transition: .2s; }.round-play:hover { transform: scale(1.06); background: white; }.round-play svg { width: 18px; fill: currentColor; stroke: none; }
.hero-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: var(--muted); background: radial-gradient(circle at center, rgba(58,103,185,.16), transparent 48%); }
.hero-empty p { max-width: 280px; margin: 8px 0; font-size: 12px; line-height: 1.6; color: var(--muted-2); }
.empty-mark { height: 58px; display: flex; align-items: end; gap: 6px; margin-bottom: 20px; }.empty-mark span { width: 8px; border-radius: 8px; background: linear-gradient(var(--cyan), var(--blue)); box-shadow: 0 0 14px rgba(85,216,255,.25); }.empty-mark span:nth-child(1) { height: 28px; }.empty-mark span:nth-child(2) { height: 48px; }.empty-mark span:nth-child(3) { height: 36px; }

.dashboard-grid { margin-top: 22px; display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(310px, .62fr); gap: 22px; align-items: start; }
.surface { border-radius: 22px; border: 1px solid var(--line); background: linear-gradient(145deg, rgba(17,25,42,.9), rgba(11,17,29,.88)); box-shadow: inset 0 1px rgba(255,255,255,.025); }
.episode-section, .pulse-card, .delivery-card, .asset-section { padding: 24px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
.section-head h2 { margin: 4px 0 0; font-size: 19px; letter-spacing: -.02em; }.section-head p { margin: 7px 0 0; color: var(--muted-2); font-size: 12px; }
.section-kicker { font-size: 8px; color: var(--blue); font-weight: 700; letter-spacing: .19em; }
.text-btn { padding: 5px 0; color: #90a9e8; background: none; font-size: 11px; }.text-btn:hover { color: var(--cyan); }.text-btn svg { width: 13px; }
.episode-list { display: flex; flex-direction: column; gap: 10px; }
.episode-card { min-height: 116px; display: grid; grid-template-columns: 154px minmax(0, 1fr) auto; gap: 18px; align-items: center; padding: 9px; border-radius: 16px; border: 1px solid transparent; background: rgba(255,255,255,.025); cursor: pointer; transition: .2s ease; outline: none; }
.episode-card:hover, .episode-card:focus-visible { transform: translateY(-1px); border-color: rgba(106,150,255,.2); background: rgba(75,104,174,.075); }
.episode-thumb { width: 154px; height: 96px; overflow: hidden; border-radius: 11px; background: #080d16; position: relative; }.episode-thumb img { width: 100%; height: 100%; object-fit: cover; }.thumb-empty { height: 100%; display: grid; place-items: center; color: #5f6d88; font-size: 24px; font-weight: 800; background: radial-gradient(circle at 40% 30%, rgba(81,113,196,.22), transparent 50%); }
.episode-index, .ready-badge { position: absolute; top: 7px; border-radius: 6px; backdrop-filter: blur(8px); font-size: 8px; font-weight: 800; letter-spacing: .05em; }.episode-index { left: 7px; padding: 4px 6px; color: white; background: rgba(5,9,17,.68); }.ready-badge { right: 7px; padding: 4px 7px; color: #9af5d3; background: rgba(6,26,24,.75); border: 1px solid rgba(82,227,173,.15); }
.episode-info { min-width: 0; }.episode-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }.episode-title-row h3 { margin: 0; font-size: 14px; }.episode-title-row p { margin: 5px 0 0; color: var(--muted-2); font-size: 10px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 360px; }.progress-value { color: #adc0ec; font: 600 11px ui-monospace, monospace; }
.progress-track { height: 3px; border-radius: 5px; background: rgba(255,255,255,.06); margin: 17px 0 11px; overflow: hidden; }.progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--cyan), var(--blue), var(--violet)); box-shadow: 0 0 12px rgba(87,165,255,.45); }
.episode-meta { display: flex; align-items: center; gap: 13px; color: var(--muted-2); font-size: 9px; }.episode-meta span { display: flex; align-items: center; }.meta-dot { width: 5px; height: 5px; border-radius: 50%; margin-right: 5px; background: var(--green); box-shadow: 0 0 7px rgba(82,227,173,.6); }
.episode-open { display: flex; align-items: center; gap: 4px; padding-right: 9px; color: #7584a2; font-size: 9px; white-space: nowrap; }.episode-open svg { width: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; }.episode-card:hover .episode-open { color: var(--cyan); }
.episode-empty { width: 100%; min-height: 190px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--muted); border: 1px dashed rgba(131,156,210,.2); border-radius: 16px; background: rgba(255,255,255,.015); cursor: pointer; }.empty-plus { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%; margin-bottom: 12px; color: var(--cyan); border: 1px solid rgba(85,216,255,.2); background: rgba(85,216,255,.05); font-size: 20px; }.episode-empty p { margin: 7px 0 0; color: var(--muted-2); font-size: 11px; }
.shot-sequence { margin-top: 22px; padding-top: 19px; border-top: 1px solid var(--line); }.shot-sequence-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; }.shot-sequence-head > div { display: flex; flex-direction: column; gap: 4px; }.shot-sequence-head span { color: var(--muted-2); font-size: 8px; letter-spacing: .1em; }.shot-sequence-head strong { font-size: 11px; }.shot-sequence-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; }.shot-sequence-grid button { min-width: 0; padding: 0 0 9px; border: 1px solid rgba(135,156,201,.1); border-radius: 11px; overflow: hidden; color: var(--ink); text-align: left; background: rgba(255,255,255,.02); cursor: pointer; transition: .2s ease; }.shot-sequence-grid button:hover { transform: translateY(-2px); border-color: rgba(85,216,255,.22); }.shot-sequence-grid button > div { height: 78px; position: relative; display: grid; place-items: center; color: #61708d; background: #080d16; }.shot-sequence-grid img { width: 100%; height: 100%; object-fit: cover; }.shot-sequence-grid i { position: absolute; right: 7px; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--green); box-shadow: 0 0 8px var(--green); }.shot-sequence-grid strong, .shot-sequence-grid small { display: block; margin: 8px 8px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.shot-sequence-grid strong { font-size: 9px; }.shot-sequence-grid small { margin-top: 4px; color: var(--muted-2); font-size: 7px; }
.side-stack { display: flex; flex-direction: column; gap: 22px; }
.section-head.compact { margin-bottom: 18px; }.section-head.compact h2 { font-size: 15px; }.pulse-dot, .complete-chip { font-size: 8px; font-weight: 700; letter-spacing: .06em; border-radius: 99px; padding: 5px 8px; }.pulse-dot { color: #8bdabe; background: rgba(82,227,173,.06); }.pulse-dot i { display: inline-block; width: 4px; height: 4px; margin-right: 5px; border-radius: 50%; background: var(--green); box-shadow: 0 0 7px var(--green); }.complete-chip { color: #9df1d2; border: 1px solid rgba(82,227,173,.15); background: rgba(82,227,173,.06); }
.pulse-score { display: flex; gap: 18px; align-items: center; padding: 7px 0 21px; border-bottom: 1px solid var(--line); }.score-ring { --score: 0deg; width: 82px; height: 82px; flex: 0 0 auto; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--cyan) 0deg, var(--blue) var(--score), rgba(255,255,255,.06) var(--score)); position: relative; }.score-ring::before { content: ''; position: absolute; inset: 5px; border-radius: 50%; background: #111929; }.score-ring > div { z-index: 1; }.score-ring strong { font-size: 20px; }.score-ring span { font-size: 9px; color: var(--muted); }.score-copy strong { font-size: 12px; }.score-copy p { margin: 7px 0 0; color: var(--muted-2); font-size: 10px; line-height: 1.6; }
.readiness-list { padding-top: 14px; display: flex; flex-direction: column; }.readiness-list > div { height: 32px; display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 10px; }.readiness-list span { display: flex; align-items: center; }.readiness-list i { width: 5px; height: 5px; margin-right: 8px; border-radius: 50%; }.readiness-list i.done { background: var(--green); }.readiness-list i.pending { background: #4c5870; }.readiness-list strong { color: #c1cbe0; font: 600 10px ui-monospace, monospace; }
.delivery-preview { aspect-ratio: 16/9; overflow: hidden; border-radius: 12px; background: #050912; border: 1px solid rgba(255,255,255,.05); }.delivery-preview video { width: 100%; height: 100%; object-fit: cover; }.delivery-meta { display: grid; grid-template-columns: 1.5fr .7fr .5fr; gap: 8px; padding: 16px 0; }.delivery-meta div { min-width: 0; display: flex; flex-direction: column; gap: 4px; }.delivery-meta span { color: var(--muted-2); font-size: 8px; text-transform: uppercase; letter-spacing: .07em; }.delivery-meta strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10px; color: #bcc7dd; }
.download-btn { width: 100%; height: 39px; border-radius: 10px; color: #b8c9f6; border: 1px solid rgba(108,141,255,.2); background: rgba(77,105,214,.08); font-size: 10px; font-weight: 700; }.download-btn:hover { color: white; background: rgba(77,105,214,.16); border-color: rgba(108,141,255,.34); }
.delivery-empty { min-height: 190px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }.delivery-empty p { max-width: 240px; margin: 7px 0; color: var(--muted-2); font-size: 10px; line-height: 1.55; }.delivery-empty-icon { width: 56px; height: 40px; margin-bottom: 15px; border-radius: 8px; border: 1px solid rgba(117,144,201,.2); display: grid; place-items: center; }.delivery-empty-icon span { width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 8px solid #61708e; }

.asset-section { margin-top: 22px; }.asset-head { align-items: flex-end; }.asset-tabs { display: flex; gap: 5px; padding: 4px; border-radius: 11px; background: rgba(255,255,255,.03); border: 1px solid var(--line); }.asset-tabs button { height: 30px; padding: 0 11px; border: 0; border-radius: 7px; background: transparent; color: var(--muted-2); font: inherit; font-size: 9px; cursor: pointer; }.asset-tabs button span { margin-left: 4px; opacity: .65; font-family: ui-monospace, monospace; }.asset-tabs button.active { color: #eaf1ff; background: rgba(97,126,219,.15); box-shadow: inset 0 0 0 1px rgba(123,153,255,.1); }
.asset-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; }.asset-card { min-width: 0; border-radius: 15px; overflow: hidden; border: 1px solid rgba(136,156,198,.11); background: rgba(255,255,255,.02); transition: .2s ease; }.asset-card:has(.asset-ready), .asset-card:has(.asset-play) { cursor: pointer; }.asset-card:hover { transform: translateY(-2px); border-color: rgba(100,157,255,.24); background: rgba(75,102,165,.06); }
.asset-media { aspect-ratio: 16/10; position: relative; overflow: hidden; background: #080d17; }.asset-media img, .asset-media video { width: 100%; height: 100%; object-fit: cover; transition: transform .45s ease; }.asset-card:hover .asset-media img { transform: scale(1.035); }.asset-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(4,8,15,.08), transparent 55%, rgba(4,8,15,.62)); pointer-events: none; }.asset-media-empty { background: radial-gradient(circle at 40% 35%, rgba(87,112,187,.18), transparent 45%), #0b111e; }.asset-placeholder { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: #7182a5; }.asset-placeholder > span { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 15px; color: #aebce0; background: linear-gradient(145deg, rgba(98,130,218,.16), rgba(126,80,201,.11)); border: 1px solid rgba(135,159,221,.15); font-size: 13px; font-weight: 800; }.asset-placeholder small { font-size: 8px; color: #53617d; }
.asset-type, .asset-ready { position: absolute; top: 8px; z-index: 2; padding: 4px 6px; border-radius: 5px; backdrop-filter: blur(7px); font-size: 7px; font-weight: 800; letter-spacing: .06em; }.asset-type { left: 8px; color: #d3ddf3; background: rgba(6,10,19,.65); }.asset-ready { right: 8px; color: #9cf1d2; background: rgba(5,25,22,.7); }.asset-ready i { display: inline-block; width: 4px; height: 4px; border-radius: 50%; margin-right: 4px; background: var(--green); }.asset-play { position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; }.asset-play svg { width: 31px; height: 31px; padding: 8px; border-radius: 50%; fill: white; background: rgba(5,10,18,.55); backdrop-filter: blur(5px); }
.asset-copy { padding: 12px 13px 13px; display: flex; flex-direction: column; gap: 5px; }.asset-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }.asset-copy p { min-height: 14px; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted-2); font-size: 9px; }.asset-copy > span { color: #667593; font-size: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.asset-empty { min-height: 230px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px dashed rgba(125,149,198,.15); border-radius: 15px; }.asset-empty p { max-width: 360px; margin: 8px 0 12px; color: var(--muted-2); font-size: 10px; line-height: 1.6; }.asset-empty-graphic { height: 43px; display: flex; gap: 7px; align-items: end; margin-bottom: 17px; }.asset-empty-graphic span { width: 38px; border: 1px solid rgba(105,139,208,.17); border-radius: 7px 7px 3px 3px; background: rgba(72,100,164,.05); }.asset-empty-graphic span:nth-child(1) { height: 27px; transform: rotate(-5deg); }.asset-empty-graphic span:nth-child(2) { height: 39px; }.asset-empty-graphic span:nth-child(3) { height: 30px; transform: rotate(5deg); }
.project-footer { min-height: 56px; display: flex; justify-content: space-between; align-items: center; color: var(--muted-2); }.project-footer > div { display: flex; gap: 10px; align-items: center; font-size: 9px; }.project-footer strong { color: #71809b; font-weight: 500; }.danger-link { border: 0; background: none; color: #865f69; font: inherit; font-size: 9px; cursor: pointer; }.danger-link:hover { color: #ff8496; }

.dialog-mask { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 20px; background: rgba(2,5,11,.72); backdrop-filter: blur(14px); }
.dialog { width: min(760px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 26px; border-radius: 22px; color: var(--ink); background: linear-gradient(145deg, #172136, #0d1525); border: 1px solid rgba(132,158,215,.2); box-shadow: 0 30px 100px rgba(0,0,0,.55); }
.project-dialog { width: min(620px, 100%); }.dialog-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }.dialog-head h2 { margin: 5px 0 0; font-size: 24px; }.dialog-head p { margin: 8px 0 0; color: var(--muted); font-size: 11px; }.dialog-kicker { color: var(--cyan); font-size: 8px; font-weight: 700; letter-spacing: .19em; }.icon-close { width: 30px; height: 30px; border: 1px solid var(--line); border-radius: 8px; color: var(--muted); background: rgba(255,255,255,.02); font-size: 20px; cursor: pointer; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 24px; }.field { display: flex; flex-direction: column; gap: 7px; }.field > span, .config-card > span { color: #aeb9d0; font-size: 10px; font-weight: 600; }.field-wide { grid-column: 1 / -1; }.input { width: 100%; min-height: 40px; box-sizing: border-box; padding: 0 12px; border: 1px solid rgba(139,159,201,.17); border-radius: 9px; outline: none; color: var(--ink); background: rgba(5,10,19,.42); font: inherit; font-size: 12px; transition: .2s; }.input:focus { border-color: rgba(85,216,255,.4); box-shadow: 0 0 0 3px rgba(85,216,255,.05); }.textarea { padding-top: 11px; resize: vertical; line-height: 1.6; }.dialog-foot { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); display: flex; justify-content: flex-end; gap: 9px; }
.config-summary { margin: 22px 0 15px; display: flex; gap: 8px; }.config-summary span { padding: 6px 9px; border-radius: 7px; color: #8291af; background: rgba(255,255,255,.025); border: 1px solid var(--line); font-size: 9px; }.config-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 11px; margin-top: 17px; }.config-card { min-width: 0; padding: 13px; display: flex; flex-direction: column; gap: 7px; border-radius: 13px; background: rgba(255,255,255,.025); border: 1px solid var(--line); }.config-card small { color: #667799; font-size: 7px; letter-spacing: .14em; }.split-foot { align-items: center; justify-content: space-between; }.split-foot p { margin: 0; color: var(--muted-2); font-size: 9px; }.split-foot > div { display: flex; gap: 8px; }
.loading-state { min-height: 100%; display: flex; align-items: center; justify-content: center; gap: 18px; color: #dce7fb; }.loading-state p { margin: 5px 0 0; color: #77839c; font-size: 11px; }.loading-orbit { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; border: 1px solid rgba(94,145,255,.18); animation: spin 1.3s linear infinite; }.loading-orbit span { width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); transform: translateY(-19px); box-shadow: 0 0 12px var(--cyan); }.error-state { flex-direction: column; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1100px) {
  .hero-panel { grid-template-columns: 1fr 44%; }.hero-copy { padding: 42px; }.metric-strip > div { padding: 0 10px; }
  .dashboard-grid { grid-template-columns: 1fr; }.side-stack { display: grid; grid-template-columns: 1fr 1fr; }
  .asset-grid { grid-template-columns: repeat(3, minmax(0,1fr)); }
}
@media (max-width: 800px) {
  .topbar { grid-template-columns: 1fr auto; padding: 0 18px; }.breadcrumb { display: none; }.top-actions .ghost-btn { display: none; }
  main { width: calc(100% - 28px); padding-top: 16px; }.hero-panel { grid-template-columns: 1fr; }.hero-copy { padding: 34px 26px; }.hero-copy h1 { font-size: 38px; }.hero-visual { min-height: 300px; margin: 0 14px 14px; }.metric-strip { margin-top: 30px; }
  .asset-head { align-items: flex-start; flex-direction: column; }.asset-tabs { max-width: 100%; overflow-x: auto; }.asset-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .episode-card { grid-template-columns: 118px minmax(0,1fr); }.episode-thumb { width: 118px; height: 80px; }.episode-open { display: none; }.side-stack { grid-template-columns: 1fr; }
  .config-grid { grid-template-columns: 1fr; }.split-foot { align-items: stretch; flex-direction: column; }.split-foot > div { justify-content: flex-end; }
}
@media (max-width: 520px) {
  .top-actions .primary-btn { padding: 0 10px; }.hero-copy { padding: 28px 20px; }.hero-actions { flex-direction: column; align-items: stretch; }.metric-strip { grid-template-columns: 1fr 1fr; gap: 16px 0; }.metric-strip > div:nth-child(2) { border-right: 0; }.hero-visual { min-height: 240px; }
  .episode-section, .pulse-card, .delivery-card, .asset-section { padding: 17px; }.episode-card { grid-template-columns: 92px minmax(0,1fr); gap: 11px; }.episode-thumb { width: 92px; height: 68px; }.episode-title-row p, .episode-meta span:nth-child(2) { display: none; }
  .shot-sequence-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .asset-grid { grid-template-columns: 1fr; }.asset-media { aspect-ratio: 16/9; }.form-grid { grid-template-columns: 1fr; }.field-wide { grid-column: auto; }.dialog { padding: 20px 17px; }.config-summary { flex-wrap: wrap; }
}
</style>
