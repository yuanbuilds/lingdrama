import type { MiddlewareHandler } from 'hono'

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
}

function statusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  if (status >= 300) return colors.cyan
  return colors.green
}

function formatTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

const SECRET_KEY = /(?:authorization|api[_-]?key|apikey|access[_-]?token|token|secret|password)/i

function sanitizeBodyValue(value: unknown, key = ''): unknown {
  if (SECRET_KEY.test(key)) return '***'
  if (typeof value === 'string') {
    if (value.startsWith('data:')) return `<data omitted: ${value.length} chars>`
    return value
  }
  if (Array.isArray(value)) return value.map(item => sanitizeBodyValue(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([childKey, childValue]) => [childKey, sanitizeBodyValue(childValue, childKey)]),
    )
  }
  return value
}

function sanitizeRequestBody(text: string) {
  try {
    return JSON.stringify(sanitizeBodyValue(JSON.parse(text)))
  } catch {
    return text
      .replace(/((?:authorization|api[_-]?key|apikey|access[_-]?token|token|secret|password)\s*[=:]\s*)[^&,\s]+/gi, '$1***')
  }
}

/**
 * 全局日志中间件 — 打印请求方法/路径/状态/耗时/请求体
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const method = c.req.method
  const path = c.req.path
  const start = performance.now()

  // 打印请求
  const time = formatTime()
  let bodyInfo = ''
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      const contentType = c.req.header('content-type') || ''
      if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
        bodyInfo = `\n  ${colors.dim}body: <binary body omitted>${colors.reset}`
      } else {
        const clone = c.req.raw.clone()
        const text = await clone.text()
        if (text) {
          const sanitized = sanitizeRequestBody(text)
          const truncated = sanitized.length > 500 ? sanitized.slice(0, 500) + '...' : sanitized
          bodyInfo = `\n  ${colors.dim}body: ${truncated}${colors.reset}`
        }
      }
    } catch {}
  }

  console.log(`${colors.dim}${time}${colors.reset} ${colors.cyan}${method}${colors.reset} ${path}${bodyInfo}`)

  await next()

  const ms = (performance.now() - start).toFixed(0)
  const status = c.res.status
  const sc = statusColor(status)
  console.log(`${colors.dim}${time}${colors.reset} ${colors.cyan}${method}${colors.reset} ${path} ${sc}${status}${colors.reset} ${colors.dim}${ms}ms${colors.reset}`)
}

/**
 * 全局错误处理 — 捕获未处理异常，打印完整堆栈
 */
export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (err: any) {
    const status = err.status || 500
    console.error(`${colors.red}[ERROR]${colors.reset} ${c.req.method} ${c.req.path}`)
    console.error(err.stack || err.message || err)
    return c.json({ code: status, message: err.message || 'Internal Server Error' }, status)
  }
}
