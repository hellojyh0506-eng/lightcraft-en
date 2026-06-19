// SiliconFlow API server-side wrapper — API Key stored server-side only, never exposed to frontend

const SF_BASE = 'https://api.siliconflow.cn/v1'
const VIDEO_MODEL = 'Wan-AI/Wan2.2-I2V-A14B'
const LLM_MODEL = 'deepseek-ai/DeepSeek-V4-Flash' // DeepSeek V4 Flash: cheap ($1/M tokens) and capable

function getApiKey(): string {
  const key = process.env.SILICONFLOW_API_KEY
  if (!key || key === 'placeholder_replace_with_real_key') {
    throw new Error('SILICONFLOW_API_KEY is not configured')
  }
  return key
}

// Submit video generation task, returns requestId
export async function submitVideo(imageDataUrl: string, prompt: string): Promise<string> {
  const res = await fetch(`${SF_BASE}/video/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      image: imageDataUrl,
    }),
    signal: AbortSignal.timeout(30_000), // 30-second timeout to prevent hanging fetch
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Video submission failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return data.requestId
}

// Query video generation status
export interface VideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  reason?: string
}

export async function getVideoStatus(requestId: string): Promise<VideoStatus> {
  const res = await fetch(`${SF_BASE}/video/status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requestId }),
    signal: AbortSignal.timeout(15_000), // 15-second timeout
  })

  if (!res.ok) {
    // 4xx = permanent error (e.g. invalid requestId) -> mark as failed to trigger refund; 5xx/network glitch = transient -> continue polling
    if (res.status >= 400 && res.status < 500) {
      return { status: 'failed', reason: `Upstream error ${res.status}` }
    }
    return { status: 'processing' }
  }

  const data = await res.json()

  // Has video result = completed
  if (data.results?.videos?.length > 0) {
    return { status: 'completed', videoUrl: data.results.videos[0].url }
  }

  // Determine status based on reason
  const reason = data.reason || ''
  if (reason === 'Failed' || reason === 'Error') {
    return { status: 'failed', reason }
  }
  if (reason === 'Queueing') {
    return { status: 'pending', reason }
  }
  return { status: 'processing', reason }
}

// AI prompt polishing — use LLM to expand simple descriptions into professional video prompts
// Context-aware AI polishing — generates different system prompts based on the user's current feature
export type PolishContext = 'edit_background' | 'edit_custom' | 'generate' | 'video'

const POLISH_PROMPTS: Record<PolishContext, string> = {
  edit_background: `You are a product photography background description expert. The user is using the "Change Background" feature — they uploaded a product image and need you to describe a suitable background.

Requirements:
1. Understand what scene background the user wants (white backdrop, wooden table, marble, outdoor, etc.)
2. Add details about lighting, materials, and atmosphere so AI can generate a high-quality background
3. Keep it under 80 words
4. Output the polished background description directly, no explanations
5. Output in English`,

  edit_custom: `You are an AI image editing instruction expert. The user is using the "Custom Edit" feature — they uploaded an image and want AI to modify certain parts of it.

Requirements:
1. Understand what the user wants to modify (change color, remove an object, add elements, change style, etc.)
2. Turn vague descriptions into precise editing instructions
3. Keep it under 80 words
4. Output the polished editing instruction directly, no explanations
5. Output in English`,

  generate: `You are an AI image generation prompt expert. The user is using the "Text to Image" feature — they need you to turn a simple description into a high-quality image generation prompt.

Requirements:
1. Understand what type of image the user wants to generate (product photo, food photo, pet photo, etc.)
2. Add composition, lighting, style, and color tone photography details
3. Oriented toward e-commerce and social media use — images should look appealing and attractive
4. Keep it under 100 words
5. Output the polished prompt directly, no explanations
6. Output in English`,

  video: `You are an AI video prompt expert. The user is using the "Image to Video" feature — they uploaded a static image and need you to describe the desired video effect.

Requirements:
1. Describe camera movement and scene changes in chronological order
2. Include specific actions (zoom in, orbit, pan), lighting changes, and atmosphere
3. Oriented toward short-form video marketing (TikTok, Instagram), should have visual impact
4. Keep it under 100 words, as one coherent paragraph
5. Output the polished prompt directly, no explanations
6. Output in English`,
}

export async function polishPrompt(rawPrompt: string, context: PolishContext = 'video'): Promise<string> {
  const systemPrompt = POLISH_PROMPTS[context]

  const res = await fetch(`${SF_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Prompt polishing failed (${res.status}): ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const polished = data.choices?.[0]?.message?.content?.trim()
  if (!polished) throw new Error('Prompt polishing returned empty result')
  return polished
}
