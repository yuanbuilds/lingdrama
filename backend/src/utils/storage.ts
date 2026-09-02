/**
 * 文件存储工具 — 下载远程文件到本地
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_ROOT_INPUT = path.resolve(process.env.STORAGE_PATH || path.resolve(__dirname, '../../../data/static'))
fs.mkdirSync(STORAGE_ROOT_INPUT, { recursive: true })
const STORAGE_ROOT = fs.realpathSync(STORAGE_ROOT_INPUT)
const DEFAULT_IMAGE_MAX_BYTES = 25 * 1024 * 1024
const DEFAULT_VIDEO_MAX_BYTES = 256 * 1024 * 1024

function assertInsideStorage(candidate: string) {
  const normalized = path.resolve(candidate)
  if (normalized === STORAGE_ROOT || !normalized.startsWith(`${STORAGE_ROOT}${path.sep}`)) {
    throw new Error('Storage path escapes the configured root')
  }
  return normalized
}

function safeStorageDir(subDir: string) {
  const normalized = String(subDir || '').replaceAll('\\', '/')
  if (!normalized || path.isAbsolute(normalized) || normalized.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error('Invalid storage directory')
  }
  const dir = assertInsideStorage(path.resolve(STORAGE_ROOT, normalized))
  fs.mkdirSync(dir, { recursive: true })
  const realDir = fs.realpathSync(dir)
  return assertInsideStorage(realDir)
}

export function resolveStoragePath(relativePath: string, options: { mustExist?: boolean } = {}) {
  const raw = String(relativePath || '')
  if (!raw || raw.includes('\0') || path.isAbsolute(raw)) throw new Error('Invalid storage path')
  const normalized = raw.replaceAll('\\', '/').replace(/^\/?static\//, '')
  if (!normalized || normalized.split('/').some(part => part === '..' || part === '.')) {
    throw new Error('Invalid storage path')
  }
  const candidate = assertInsideStorage(path.resolve(STORAGE_ROOT, normalized))
  if (options.mustExist) {
    if (!fs.existsSync(candidate)) throw new Error('Storage object not found')
    return assertInsideStorage(fs.realpathSync(candidate))
  }
  if (fs.existsSync(candidate)) return assertInsideStorage(fs.realpathSync(candidate))
  return candidate
}

/**
 * 下载远程文件到本地存储
 */
export async function downloadFile(
  url: string,
  subDir: string,
  options: {
    headers?: Record<string, string>
    extension?: string
    maxBytes?: number
    timeoutMs?: number
  } = {},
): Promise<string> {
  const parsedUrl = new URL(url)
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Only HTTP(S) downloads are allowed')
  const dir = safeStorageDir(subDir)

  const ext = normalizeExtension(options.extension) || getExtFromUrl(url)
  const filename = `${uuid()}${ext}`
  const filePath = assertInsideStorage(path.join(dir, filename))
  const partialPath = `${filePath}.part`
  const isVideo = subDir.split('/')[0] === 'videos'
  const maxBytes = options.maxBytes ?? (isVideo ? DEFAULT_VIDEO_MAX_BYTES : DEFAULT_IMAGE_MAX_BYTES)
  const timeoutMs = options.timeoutMs ?? (isVideo ? 120_000 : 30_000)

  const resp = await fetch(parsedUrl, {
    headers: options.headers,
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
  const declaredBytes = Number(resp.headers.get('content-length') || 0)
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new Error(`Download exceeds ${maxBytes} bytes`)
  }
  if (!resp.body) throw new Error('Download returned no body')

  let handle: number | undefined
  try {
    handle = fs.openSync(partialPath, 'wx')
    const reader = resp.body.getReader()
    let received = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      received += value.byteLength
      if (received > maxBytes) {
        await reader.cancel('download size limit exceeded')
        throw new Error(`Download exceeds ${maxBytes} bytes`)
      }
      fs.writeSync(handle, Buffer.from(value))
    }
    fs.closeSync(handle)
    handle = undefined
    fs.renameSync(partialPath, filePath)
  } catch (error) {
    if (handle !== undefined) fs.closeSync(handle)
    fs.rmSync(partialPath, { force: true })
    throw error
  }

  // 返回相对路径（供 API 返回给前端）
  return `static/${subDir}/${filename}`
}

function normalizeExtension(extension?: string) {
  if (!extension) return ''
  const normalized = extension.startsWith('.') ? extension : `.${extension}`
  return /^\.[a-z0-9]{1,8}$/i.test(normalized) ? normalized : ''
}

/**
 * 保存上传的文件
 */
export async function saveUploadedFile(data: ArrayBuffer, subDir: string, originalName: string): Promise<string> {
  if (data.byteLength > DEFAULT_IMAGE_MAX_BYTES) throw new Error('Uploaded file is too large')
  const dir = safeStorageDir(subDir)

  const ext = normalizeExtension(path.extname(path.basename(originalName))) || '.bin'
  const filename = `${uuid()}${ext}`
  const filePath = assertInsideStorage(path.join(dir, filename))

  fs.writeFileSync(filePath, Buffer.from(data))
  return `static/${subDir}/${filename}`
}

function getExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname)
    if (ext && ext.length <= 5) return ext
  } catch {}
  return '.bin'
}

/**
 * 获取本地文件的绝对路径
 */
export function getAbsolutePath(relativePath: string): string {
  return resolveStoragePath(relativePath)
}

/**
 * 保存 Base64 编码的图片数据到本地存储
 * 用于 Gemini 等只返回 base64 数据的厂商
 */
export async function saveBase64Image(base64Data: string, mimeType: string, subDir: string): Promise<string> {
  const dir = safeStorageDir(subDir)

  // 从 mimeType 推断文件扩展名
  const ext = mimeTypeToExt(mimeType)
  const filename = `${uuid()}${ext}`
  const filePath = assertInsideStorage(path.join(dir, filename))

  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.byteLength > DEFAULT_IMAGE_MAX_BYTES) throw new Error('Decoded image is too large')
  fs.writeFileSync(filePath, buffer)

  return `static/${subDir}/${filename}`
}

export function readImageAsDataUrl(relativePath: string): string {
  const filePath = resolveStoragePath(relativePath, { mustExist: true })
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeType = extToMimeType(ext)
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function readImageAsCompressedDataUrl(
  relativePath: string,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<string> {
  const filePath = resolveStoragePath(relativePath, { mustExist: true })
  const maxWidth = options.maxWidth ?? 768
  const maxHeight = options.maxHeight ?? 768
  const quality = options.quality ?? 68

  const resized = sharp(filePath).rotate().resize({
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  })
  const metadata = await resized.metadata()
  const output = metadata.hasAlpha
    ? await resized.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer()
    : await resized.jpeg({ quality, mozjpeg: true }).toBuffer()
  const mimeType = 'image/jpeg'
  return `data:${mimeType};base64,${output.toString('base64')}`
}

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    data: match[2],
  }
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  return map[mimeType] || '.png'
}

function extToMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return map[ext] || 'image/png'
}
