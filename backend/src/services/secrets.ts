import fs from 'fs'

/**
 * Resolve a stored secret without exposing it through the configuration API.
 * Plain values remain supported for backwards compatibility.
 *
 * Supported references:
 * - env:VARIABLE_NAME
 * - file:/absolute/path/to/secret
 */
export function resolveSecret(value?: string | null): string {
  const raw = String(value || '').trim()
  if (!raw) return ''

  if (raw.startsWith('env:')) {
    const name = raw.slice(4).trim()
    if (!name) throw new Error('Secret environment variable name is empty')
    const resolved = process.env[name]
    if (!resolved) throw new Error(`Secret environment variable is not set: ${name}`)
    return resolved.trim()
  }

  if (raw.startsWith('file:')) {
    const filePath = raw.slice(5).trim()
    if (!filePath) throw new Error('Secret file path is empty')
    return fs.readFileSync(filePath, 'utf8').trim()
  }

  return raw
}
