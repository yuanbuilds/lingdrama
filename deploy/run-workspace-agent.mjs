#!/usr/bin/env node

/**
 * Runs one real, authenticated LingDrama agent workflow for a workspace.
 * Credentials are accepted only through the environment and are never logged.
 */

const origin = new URL(process.env.LINGDRAMA_URL || 'http://127.0.0.1:5679')
const account = process.env.LINGDRAMA_ACCOUNT || ''
const password = process.env.LINGDRAMA_PASSWORD || ''
const agent = process.env.LINGDRAMA_AGENT || 'script_rewriter'
const message = process.env.LINGDRAMA_MESSAGE || 'Rewrite this concept as a polished, production-ready short-form screenplay. Preserve the core hook, build a clear visual escalation, and save the complete screenplay.'

if (!account || !password) throw new Error('LINGDRAMA_ACCOUNT and LINGDRAMA_PASSWORD are required')

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

function dataOf(body) {
  return body && typeof body === 'object' && 'data' in body ? body.data : body
}

const login = await request('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account, password, remember: false }),
})
if (!login.response.ok || !cookie) throw new Error(`Login failed: HTTP ${login.response.status}`)

const projectsResponse = await request('/api/v1/dramas')
const projects = dataOf(projectsResponse.body)?.items || []
const project = projects[0]
const episode = project?.episodes?.[0]
if (!project || !episode) throw new Error('Workspace has no project episode')

const started = Date.now()
const result = await request(`/api/v1/agent/${encodeURIComponent(agent)}/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, drama_id: project.id, episode_id: episode.id }),
})
const resultData = dataOf(result.body)

const refreshed = await request('/api/v1/dramas')
const refreshedProject = (dataOf(refreshed.body)?.items || []).find(item => item.id === project.id)
const refreshedEpisode = refreshedProject?.episodes?.find(item => item.id === episode.id)
const activity = await request('/api/v1/usage/activity?limit=5')
const activityItems = dataOf(activity.body)?.items || dataOf(activity.body) || []
const latestActivity = Array.isArray(activityItems) ? activityItems[0] : null

await request('/api/v1/auth/logout', { method: 'POST' })

const summary = {
  ok: result.response.ok,
  http_status: result.response.status,
  workspace_account: account,
  project: project.title,
  episode: episode.title,
  agent,
  elapsed_ms: Date.now() - started,
  tool_calls: (resultData?.toolCalls || []).map(call => call.toolName).filter(Boolean),
  response_chars: String(resultData?.text || '').length,
  script_chars: String(refreshedEpisode?.script_content || '').length,
  activity: latestActivity ? {
    status: latestActivity.status,
    model: latestActivity.model,
    total_tokens: latestActivity.total_tokens,
    latency_ms: latestActivity.latency_ms,
  } : null,
}
console.log(JSON.stringify(summary, null, 2))
if (!result.response.ok) {
  console.error(typeof result.body === 'string' ? result.body.slice(0, 500) : JSON.stringify(result.body).slice(0, 500))
  process.exitCode = 1
}
