#!/usr/bin/env node

/**
 * Zero-dependency public smoke test for a deployed LingDrama instance.
 * Optional credentials are read only from environment variables and are never
 * printed. The script performs no production writes beyond creating/revoking
 * its own login session.
 */

const origin = new URL(process.env.LINGDRAMA_URL || 'http://127.0.0.1:5679')
const account = process.env.LINGDRAMA_ACCOUNT || ''
const password = process.env.LINGDRAMA_PASSWORD || ''
const results = []
let cookie = ''
let lastSetCookie = ''

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  const marker = ok ? 'PASS' : 'FAIL'
  console.log(`${marker.padEnd(4)}  ${name}${detail ? ` — ${detail}` : ''}`)
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers || {})
  headers.set('Accept', 'application/json')
  if (cookie) headers.set('Cookie', cookie)
  const response = await fetch(new URL(pathname, origin), { ...options, headers, redirect: 'manual' })
  const setCookie = response.headers.get('set-cookie')
  if (setCookie) {
    lastSetCookie = setCookie
    cookie = setCookie.split(';', 1)[0]
  }
  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json') ? await response.json() : await response.text()
  return { response, body }
}

function dataOf(body) {
  return body && typeof body === 'object' && 'data' in body ? body.data : body
}

async function checkPage(pathname) {
  try {
    const { response, body } = await request(pathname, { headers: { Accept: 'text/html' } })
    const valid = response.status === 200 && typeof body === 'string' && body.length > 500
    record(`page ${pathname}`, valid, `HTTP ${response.status}, ${String(body).length} bytes`)
  } catch (error) {
    record(`page ${pathname}`, false, error.message)
  }
}

try {
  const health = await request('/api/v1/health')
  record('API health', health.response.status === 200 && health.body?.status === 'ok', `HTTP ${health.response.status}`)

  for (const pathname of ['/', '/showcase', '/login']) await checkPage(pathname)

  const publicDramas = await request('/api/v1/dramas')
  const publicItems = dataOf(publicDramas.body)?.items || []
  record('public production library', publicDramas.response.status === 200 && publicItems.length > 0, `${publicItems.length} production(s)`)

  const flagship = publicItems.find(item => /59\s*秒|59(?:th)?\s*second/i.test(String(item.title || '')))
    || publicItems.find(item => item.production_summary?.final_ready || item.preview_video)
  record('flagship production', Boolean(flagship), flagship?.title || 'not found')

  if (flagship?.preview_video) {
    const mediaUrl = new URL(String(flagship.preview_video).replace(/^\//, ''), origin)
    const media = await fetch(mediaUrl, { headers: { Range: 'bytes=0-4095' } })
    const bytes = new Uint8Array(await media.arrayBuffer())
    record('flagship media range', [200, 206].includes(media.status) && bytes.length > 0, `HTTP ${media.status}, ${bytes.length} bytes`)
  }

  if (account && password) {
    const login = await request('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account, password, remember: false }),
    })
    record('server authentication', login.response.status === 200 && Boolean(cookie), `HTTP ${login.response.status}`)
    const secureCookie = /;\s*HttpOnly\b/i.test(lastSetCookie)
      && /;\s*SameSite=Lax\b/i.test(lastSetCookie)
      && (origin.protocol !== 'https:' || /;\s*Secure\b/i.test(lastSetCookie))
    record('session cookie security', secureCookie, origin.protocol === 'https:' ? 'Secure · HttpOnly · SameSite=Lax' : 'HttpOnly · SameSite=Lax')

    if (login.response.status === 200) {
      const [me, workspaces, dramas, usage] = await Promise.all([
        request('/api/v1/auth/me'),
        request('/api/v1/workspaces'),
        request('/api/v1/dramas'),
        request('/api/v1/usage/summary'),
      ])
      record('authenticated identity', me.response.status === 200 && Boolean(dataOf(me.body)?.user), `HTTP ${me.response.status}`)
      const workspaceData = dataOf(workspaces.body)
      const workspaceItems = Array.isArray(workspaceData)
        ? workspaceData
        : (workspaceData?.items || workspaceData?.workspaces || [])
      record('workspace access', workspaces.response.status === 200 && workspaceItems.length > 0, `HTTP ${workspaces.response.status}`)
      record('tenant production library', dramas.response.status === 200, `HTTP ${dramas.response.status}`)
      record('workspace usage summary', usage.response.status === 200, `HTTP ${usage.response.status}`)

      const logout = await request('/api/v1/auth/logout', { method: 'POST' })
      record('session revocation', logout.response.status === 200, `HTTP ${logout.response.status}`)
      const afterLogout = await request('/api/v1/auth/me')
      record('revoked session rejected', afterLogout.response.status === 401, `HTTP ${afterLogout.response.status}`)
    }
  } else {
    console.log('SKIP  authenticated checks — set LINGDRAMA_ACCOUNT and LINGDRAMA_PASSWORD')
  }
} catch (error) {
  record('smoke runner', false, error.cause?.message || error.message)
}

if (results.some(result => !result.ok)) process.exitCode = 1
