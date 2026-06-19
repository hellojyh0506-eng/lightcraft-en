import type { ProviderAdapter, SubmitInput, PollResult } from './types'

// DashScope/Bailian adapter（已查实 wan2.6-i2v-flash legacy 首帧 API）
const BASE = 'https://dashscope.aliyuncs.com/api/v1'

function apiKey(): string {
  const k = process.env.DASHSCOPE_API_KEY
  if (!k) throw new Error('DASHSCOPE_API_KEY 未配置')
  return k
}

export const bailianAdapter: ProviderAdapter = {
  async submit({ engine, prompt, images, durationSec }: SubmitInput): Promise<string> {
    const isKf2v = engine.capability === 'kf2v'
    // ⚠️ kf2v fields unverified — placeholder; verify from wan2.2-kf2v-flash docs before implementing
    const input = isKf2v
      ? { prompt, first_frame_url: images[0], last_frame_url: images[1] }
      : { prompt, img_url: images[0] } // i2v: verified — img_url accepts URL or base64 dataURL
    const body = {
      model: engine.modelCode,
      input,
      parameters: {
        resolution: engine.resolution,
        duration: durationSec,
        audio: engine.audio, // Silent mode must be explicitly false, otherwise charged at audio price
        watermark: process.env.FORCE_AI_WATERMARK === 'true', // Off by default for overseas; set FORCE_AI_WATERMARK=true for China compliance
      },
    }
    const res = await fetch(`${BASE}/services/aigc/video-generation/video-synthesis`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        'X-DashScope-Async': 'enable', // 必须，否则报错
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000), // 30 s timeout — prevent fetch from hanging forever
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({} as Record<string, string>))
      throw new Error(`Bailian submit failed ${res.status}: ${errBody.code || ''} ${errBody.message || ''}`.trim())
    }
    const data = await res.json()
    const taskId = data.output?.task_id
    if (!taskId) throw new Error(data.code || 'Bailian did not return task_id')
    return taskId
  },

  async poll(taskId: string): Promise<PollResult> {
    const res = await fetch(`${BASE}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey()}` },
      signal: AbortSignal.timeout(15_000), // 15 秒超时
    })
    if (!res.ok) {
      // 4xx permanent error → fail + trigger refund; 5xx/network → keep polling
      if (res.status >= 400 && res.status < 500) {
        const errBody = await res.json().catch(() => ({} as Record<string, string>))
        return { status: 'failed', reason: `Query failed ${res.status}: ${errBody.code || ''} ${errBody.message || ''}`.trim() }
      }
      return { status: 'processing' }
    }
    const data = await res.json()
    const o = data?.output
    if (!o || !o.task_status) {
      console.error('[百炼:poll] Unexpected response format:', JSON.stringify(data).slice(0, 200))
      return { status: 'processing' }
    }
    switch (o?.task_status) {
      case 'SUCCEEDED':
        return { status: 'completed', videoUrl: o.video_url }
      case 'FAILED':
      case 'CANCELED':
      case 'UNKNOWN':
        return { status: 'failed', reason: o.code || o.task_status }
      default:
        return { status: 'processing' } // PENDING / RUNNING
    }
  },
}
