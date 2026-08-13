#!/usr/bin/env node

/**
 * Run real, read-only DeepSeek production research inside each showcase
 * workspace. Agent responses are retained in a private (non-static) data
 * directory so the calls create reusable production material rather than
 * synthetic usage. Credentials are read from a root-owned JSON file and are
 * never written to output or logs.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const origin = new URL(process.env.LINGDRAMA_URL || 'http://127.0.0.1:5679')
const secretFile = process.env.LINGDRAMA_SEED_PASSWORD_FILE
const outputRoot = process.env.LINGDRAMA_RESEARCH_DIR || '/app/data/private-ai-research'

if (!secretFile) throw new Error('LINGDRAMA_SEED_PASSWORD_FILE is required')

const secrets = JSON.parse(await fs.readFile(secretFile, 'utf8'))
const accounts = Object.keys(secrets.passwords || {}).sort()
if (!accounts.length) throw new Error('No workspace passwords found')

const jobs = [
  {
    slug: 'character-continuity',
    message: '角色：调用 read_characters 读取项目角色。为每个角色输出一套可直接进入电影级图像生产的英文视觉身份与连续性规范：不可漂移的面部与体态锚点、发型服装材质、情绪表演范围、镜头距离适配、正负提示词、16:9 与 9:16 构图约束。内容要具体、结构完整，并以当前项目设定为准。',
  },
  {
    slug: 'environment-lookdev',
    message: '场景：调用 read_scenes 读取项目场景。输出一套专业英文 look-development 与摄影规范：空间结构、时间与天气、主辅光源、色彩脚本、材质和空气感、镜头与景深、声音氛围、连续性禁区、16:9 与 9:16 安全构图，并给每个场景一条可直接用于高质量生成的主提示词。',
  },
  {
    slug: 'narrative-grid',
    message: '宫格：先调用 read_shots_for_grid 读取当前分镜，再选择最能表达开端、升级、转折和悬念收束的四个镜头，调用 generate_grid_prompt 生成 2x2 first_frame 宫格提示词。严格要求 exactly 4 visible panels、no merged panels、no missing panels、consistent art style、cinematic quality，并在最终答复解释四格的叙事节奏和连续性控制。',
  },
  {
    slug: 'key-art-system',
    message: '角色：调用 read_characters。基于项目真实人物设定，输出三套英文 key-art 方向（平台横幅、竖版海报、项目缩略图），每套包含构图、人物比例、留白区、光线、色彩、表演、镜头、负面约束和完整提示词。必须像成熟流媒体短剧项目，而不是通用 AI 海报。',
  },
  {
    slug: 'mobile-visual-package',
    message: '场景：调用 read_scenes。为移动端短剧观看场景输出一套英文 9:16 视觉适配包：主体安全区、近景重构、字幕安全区、明暗可读性、背景简化、转场连续性、封面首帧与高潮帧提示词；同时说明如何从 16:9 保留叙事信息而不是机械裁切。',
  },
]

function dataOf(body) {
  return body && typeof body === 'object' && 'data' in body ? body.data : body
}

async function runWorkspace(account) {
  const password = secrets.passwords[account]
  let cookie = ''

  async function request(pathname, options = {}) {
    const headers = new Headers(options.headers || {})
    headers.set('Accept', 'application/json')
    if (cookie) headers.set('Cookie', cookie)
    const response = await fetch(new URL(pathname, origin), { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) cookie = setCookie.split(';', 1)[0]
    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json') ? await response.json() : await response.text()
    return { response, body }
  }

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password, remember: false }),
  })
  if (!login.response.ok || !cookie) throw new Error(`${account}: login failed (${login.response.status})`)

  const projectsResponse = await request('/api/v1/dramas')
  const project = (dataOf(projectsResponse.body)?.items || [])[0]
  const episode = project?.episodes?.[0]
  if (!project || !episode) throw new Error(`${account}: no project episode`)

  const workspaceDir = path.join(outputRoot, account.replace(/[^a-z0-9.-]+/gi, '_'))
  await fs.mkdir(workspaceDir, { recursive: true, mode: 0o700 })
  const completed = []

  for (const job of jobs) {
    const startedAt = new Date().toISOString()
    const started = Date.now()
    const response = await request('/api/v1/agent/grid_prompt_generator/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${job.message}\n\n必须在工具调用后返回完整正文，不得只思考、不得返回空内容。`,
        drama_id: project.id,
        episode_id: episode.id,
      }),
    })
    if (!response.response.ok) throw new Error(`${account}/${job.slug}: HTTP ${response.response.status}`)

    const result = dataOf(response.body) || {}
    const activityResponse = await request('/api/v1/usage/activity')
    const activity = (dataOf(activityResponse.body) || []).find(item => (
      item.agent_type === 'grid_prompt_generator'
      && Number(item.drama_id) === Number(project.id)
      && item.created_at >= startedAt
    ))
    if (!/deepseek-v4-pro/i.test(String(activity?.model || ''))) {
      throw new Error(`${account}/${job.slug}: DeepSeek Pro activity was not verified`)
    }
    if (!String(result.text || '').trim()) {
      throw new Error(`${account}/${job.slug}: model returned empty content`)
    }
    const artifact = {
      account,
      project: { id: project.id, title: project.title },
      episode: { id: episode.id, title: episode.title },
      research_type: job.slug,
      started_at: startedAt,
      elapsed_ms: Date.now() - started,
      model: activity?.model || null,
      usage: activity ? {
        input_tokens: activity.input_tokens,
        output_tokens: activity.output_tokens,
        total_tokens: activity.total_tokens,
        latency_ms: activity.latency_ms,
      } : null,
      tool_calls: (result.toolCalls || []).map(call => call.toolName).filter(Boolean),
      response: String(result.text || ''),
    }
    await fs.writeFile(
      path.join(workspaceDir, `${job.slug}.json`),
      `${JSON.stringify(artifact, null, 2)}\n`,
      { mode: 0o600 },
    )
    completed.push({ research_type: job.slug, ...artifact.usage, elapsed_ms: artifact.elapsed_ms })
    console.log(JSON.stringify({ account, project: project.title, ...completed.at(-1) }))
  }

  await request('/api/v1/auth/logout', { method: 'POST' })
  return { account, project: project.title, completed }
}

const settled = await Promise.allSettled(accounts.map(runWorkspace))
const failures = settled.filter(item => item.status === 'rejected')
for (const failure of failures) console.error(failure.reason?.message || String(failure.reason))

const manifest = {
  generated_at: new Date().toISOString(),
  model_requirement: 'deepseek-v4-pro',
  workspaces: settled.filter(item => item.status === 'fulfilled').map(item => item.value),
  failures: failures.length,
}
await fs.mkdir(outputRoot, { recursive: true, mode: 0o700 })
await fs.writeFile(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })

if (failures.length) process.exitCode = 1
