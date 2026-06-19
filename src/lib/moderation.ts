export interface ModerationResult {
  approved: boolean
  reason?: string
}

const TIMEOUT_MS = 5_000

function getCreemBaseUrl(): string {
  const key = process.env.CREEM_API_KEY || ''
  return key.startsWith('creem_test_')
    ? 'https://test-api.creem.io'
    : 'https://api.creem.io'
}

export async function moderateText(prompt: string): Promise<ModerationResult> {
  const apiKey = process.env.CREEM_API_KEY
  if (!apiKey) {
    console.warn('[moderation] CREEM_API_KEY not set — skipping moderation')
    return { approved: true }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const res = await fetch(`${getCreemBaseUrl()}/v1/moderation/prompt`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      // Fail closed: API error → block
      console.error(`Creem moderation API returned ${res.status}`)
      return { approved: false, reason: 'Moderation service unavailable' }
    }

    const data = await res.json()
    const decision: string = data.decision

    if (decision === 'allow') {
      return { approved: true }
    }
    // 'flag' and 'deny' both block (Creem recommendation)
    return { approved: false, reason: `Prompt ${decision} by content policy` }
  } catch (err) {
    // Fail closed: network error / timeout → block
    console.error('Creem moderation call failed:', err)
    return { approved: false, reason: 'Moderation service unavailable' }
  }
}

// Creem 只审核文本 prompt；图片由 AI 模型内置安全检查处理
export async function moderateImage(_imageDataUrl: string): Promise<ModerationResult> {
  return { approved: true }
}

export async function moderateVideo(_videoUrl: string): Promise<ModerationResult> {
  return { approved: true }
}
