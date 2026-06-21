import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deductCredits, refundCredits, InsufficientCreditsError } from '@/lib/credits'
import { assertActiveMembership, MembershipError } from '@/lib/membership'
import { moderateText } from '@/lib/moderation'
import { createRateLimiter } from '@/lib/rate-limit'
import { bodyTooLarge } from '@/lib/security'
import { z } from 'zod'

const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 5 })

// Credit costs per quality tier
const CREDIT_COST = { fast: 2, pro: 4 } as const
const FAST_IMAGE_COUNT = 3

const genSchema = z.object({
  prompt: z.string().min(1, 'Please enter a prompt').max(1000, 'Prompt is too long'),
  style: z.string().optional(),
  aspectRatio: z.string().optional(),
  quality: z.enum(['fast', 'pro']).default('fast'),
})

export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const userId = session.user.id
  if (limiter.check(userId)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request format' }, { status: 400 }) }

  const parsed = genSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { prompt, style, aspectRatio, quality } = parsed.data
  const cost = CREDIT_COST[quality]

  // Membership access check
  const user = await db.user.findUnique({ where: { id: userId }, select: { membership: true, trialEndsAt: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  try { assertActiveMembership(user) } catch (e) {
    if (e instanceof MembershipError) return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    throw e
  }

  // Style prefix for Kolors
  const stylePrefix: Record<string, string> = {
    'anime': 'anime style illustration, ',
    '3D': '3D rendered, high quality 3D render, ',
    'watercolor': 'watercolor painting style, ',
  }
  const styledPrompt = (style && stylePrefix[style]) ? stylePrefix[style] + prompt : prompt

  const mod = await moderateText(prompt)
  if (!mod.approved) return NextResponse.json({ error: `Content policy violation: ${mod.reason}` }, { status: 400 })

  try {
    await deductCredits(userId, cost, 'image_gen')
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, { status: 400 })
    }
    throw e
  }

  // Pro mode: single high-quality image (non-streaming)
  if (quality === 'pro') {
    try {
      const imageUrls = await generateWithWanxiang(styledPrompt, aspectRatio)
      if (imageUrls.length === 0) throw new Error('No images returned')
      const gen = await db.generation.create({
        data: { userId, type: 'image_gen', prompt, resultImageUrl: imageUrls[0], creditsUsed: cost, mode: `${style || 'auto'}_pro`, status: 'completed' },
      })
      return NextResponse.json({ generationId: gen.id, imageUrl: imageUrls[0], imageUrls, quality, status: 'completed' })
    } catch {
      await refundCredits(userId, cost, 'generation_failed').catch((e) => console.error('Refund failed:', e))
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
    }
  }

  // Fast mode: 3 images streamed progressively via NDJSON
  // 先创建 DB 记录（后面流式更新）
  const gen = await db.generation.create({
    data: { userId, type: 'image_gen', prompt, creditsUsed: cost, mode: `${style || 'auto'}_fast`, status: 'completed' },
  })

  const sizeMap: Record<string, string> = {
    '1:1': '1024x1024', '16:9': '1024x576', '9:16': '576x1024',
  }
  const imageSize = sizeMap[aspectRatio || '1:1'] || '1024x1024'
  const apiKey = process.env.SILICONFLOW_API_KEY
  if (!apiKey) {
    await refundCredits(userId, cost, 'generation_failed').catch((e) => console.error('Refund failed:', e))
    return NextResponse.json({ error: 'Image service not configured' }, { status: 503 })
  }

  // 用 ReadableStream 实现渐进式输出，每生成一张就推送一行 JSON
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let firstUrl: string | null = null
      let successCount = 0

      for (let i = 0; i < FAST_IMAGE_COUNT; i++) {
        try {
          const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'Kwai-Kolors/Kolors',
              prompt: styledPrompt,
              image_size: imageSize,
              num_inference_steps: 25,
              seed: Math.floor(Math.random() * 2147483647), // 不同 seed 产生不同结果
            }),
          })
          const data = await res.json()
          const url = data.images?.[0]?.url
          if (url) {
            if (!firstUrl) firstUrl = url
            successCount++
            // 推送一行 NDJSON：{index, imageUrl, generationId, total}
            controller.enqueue(encoder.encode(JSON.stringify({ index: i, imageUrl: url, generationId: gen.id, total: FAST_IMAGE_COUNT }) + '\n'))
          }
        } catch {
          // 单张失败不影响其他，继续
        }
      }

      // 更新 DB 记录为第一张图的 URL
      if (firstUrl) {
        await db.generation.update({ where: { id: gen.id }, data: { resultImageUrl: firstUrl } }).catch(() => {})
      }

      // 如果全部失败，退款
      if (successCount === 0) {
        await refundCredits(userId, cost, 'generation_failed').catch((e) => console.error('Refund failed:', e))
        controller.enqueue(encoder.encode(JSON.stringify({ error: 'All image generations failed' }) + '\n'))
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  })
}

// Pro: 通义万相 (wan2.7-image) via DashScope API
async function generateWithWanxiang(prompt: string, aspectRatio?: string): Promise<string[]> {
  const apiKey = process.env.DASHSCOPE_API_KEY
  if (!apiKey) throw new Error('DASHSCOPE_API_KEY not set')

  const sizeMap: Record<string, string> = {
    '1:1': '1024*1024', '16:9': '1280*720', '9:16': '720*1280',
  }

  // 1. 提交异步任务
  const submitRes = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify({
      model: 'wanx2.1-t2i-plus',
      input: { prompt },
      parameters: { size: sizeMap[aspectRatio || '1:1'] || '1024*1024', n: 1 },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const submitData = await submitRes.json()
  const taskId = submitData.output?.task_id
  if (!taskId) throw new Error(submitData.message || 'Failed to submit image generation task')

  // 2. 轮询等待完成（最多 90 秒）
  const start = Date.now()
  while (Date.now() - start < 90_000) {
    await new Promise((r) => setTimeout(r, 2000))

    const pollRes = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })
    const pollData = await pollRes.json()
    const status = pollData.output?.task_status

    if (status === 'SUCCEEDED') {
      const results = pollData.output?.results || []
      const urls = results.map((r: { url?: string }) => r.url).filter(Boolean) as string[]
      if (urls.length > 0) return urls
      throw new Error('No images in result')
    }
    if (status === 'FAILED') {
      throw new Error(pollData.output?.message || 'Image generation failed')
    }
    // PENDING / RUNNING → continue polling
  }
  throw new Error('Image generation timed out')
}
