/**
 * OpenAI-compatible video generation adapter.
 *
 * Protocol:
 * - POST /v1/videos
 * - GET  /v1/videos/:id
 * - GET  /v1/videos/:id/content
 *
 * The create endpoint accepts JSON for text-to-video and the official
 * multipart form when a local reference frame is available.
 */
import type {
  VideoProviderAdapter,
  ProviderRequest,
  AIConfig,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
} from './types'
import { joinProviderUrl } from './url'

export class OpenAIVideoAdapter implements VideoProviderAdapter {
  provider = 'openai'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model || 'sora-2'
    const prompt = record.prompt || ''
    const seconds = String(this.normalizeDuration(record.duration))
    const size = this.normalizeSize(record.aspectRatio)
    const reference = this.getReferenceDataUrl(record)

    if (reference) {
      const parsed = parseDataUrl(reference)
      if (parsed) {
        const form = new FormData()
        form.set('model', model)
        form.set('prompt', prompt)
        form.set('seconds', seconds)
        form.set('size', size)
        form.set('input_reference', new Blob([parsed.buffer], { type: parsed.mimeType }), `reference.${parsed.extension}`)
        return {
          url: joinProviderUrl(config.baseUrl, '/v1', '/videos'),
          method: 'POST',
          headers: { Authorization: `Bearer ${config.apiKey}` },
          body: form,
        }
      }
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', '/videos'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: { model, prompt, seconds, size },
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const taskId = result.task_id || result.id || result.data?.id
    const videoUrl = this.extractVideoUrl(result)
    if (taskId) return { isAsync: true, taskId }
    if (videoUrl) return { isAsync: false, videoUrl }
    throw new Error('No video task ID or URL in OpenAI-compatible response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v1', `/videos/${taskId}`),
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: undefined,
    }
  }

  buildDownloadRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v1', `/videos/${taskId}/content`),
      method: 'GET',
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    const status = String(result.status || result.state || result.data?.status || '').toLowerCase()
    if (['completed', 'succeeded', 'success'].includes(status)) {
      return { status: 'completed', videoUrl: this.extractVideoUrl(result) || undefined }
    }
    if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
      return { status: 'failed', error: errorMessage(result) }
    }
    if (['queued', 'pending'].includes(status)) return { status: 'pending' }
    return { status: 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url
      || result.url
      || result.data?.video_url
      || result.data?.url
      || result.content?.video_url
      || null
  }

  private getReferenceDataUrl(record: VideoGenerationRecord): string | null {
    if (record.referenceMode === 'single') return dataUrlOnly(record.imageUrl)
    if (record.referenceMode === 'first_last') return dataUrlOnly(record.firstFrameUrl)
    return null
  }

  private normalizeDuration(duration?: number | null): 4 | 8 | 12 {
    const value = Math.max(1, Number(duration || 4))
    if (value <= 6) return 4
    if (value <= 10) return 8
    return 12
  }

  private normalizeSize(aspectRatio?: string | null): string {
    if (aspectRatio === '9:16') return '720x1280'
    return '1280x720'
  }
}

function dataUrlOnly(value?: string | null) {
  const raw = String(value || '').trim()
  return raw.startsWith('data:image/') ? raw : null
}

function parseDataUrl(value: string): { mimeType: string; extension: string; buffer: ArrayBuffer } | null {
  const match = value.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/s)
  if (!match) return null
  const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1]
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
  const bytes = Uint8Array.from(Buffer.from(match[2], 'base64'))
  return { mimeType, extension, buffer: bytes.buffer }
}

function errorMessage(result: any) {
  if (typeof result.error === 'string') return result.error
  return result.error?.message || result.message || result.data?.error || 'Video generation failed'
}
