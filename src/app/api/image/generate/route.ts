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
const IMAGE_GEN_COST = 2

const genSchema = z.object({
  prompt: z.string().min(1, 'Please enter a prompt').max(1000, 'Prompt is too long'),
  style: z.string().optional(),
  aspectRatio: z.string().optional(),
})

// Kolors is a synchronous API — returns image URL directly, no polling needed
export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (limiter.check(session.user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request format' }, { status: 400 }) }

  const parsed = genSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { prompt, style, aspectRatio } = parsed.data

  // Membership access check — starter / expired trial cannot access
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { membership: true, trialEndsAt: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  try { assertActiveMembership(user) } catch (e) {
    if (e instanceof MembershipError) return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    throw e
  }

  // Style prefix — guide the model to generate corresponding style (Kolors doesn't support style param, injected via prompt)
  const stylePrefix: Record<string, string> = {
    'anime': 'anime style illustration, ',
    '3D': '3D rendered, high quality 3D render, ',
    'watercolor': 'watercolor painting style, ',
  }
  const styledPrompt = (style && stylePrefix[style]) ? stylePrefix[style] + prompt : prompt

  const mod = await moderateText(prompt)
  if (!mod.approved) return NextResponse.json({ error: `Content policy violation: ${mod.reason}` }, { status: 400 })

  try {
    await deductCredits(session.user.id, IMAGE_GEN_COST, 'image_gen')
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, { status: 400 })
    }
    throw e
  }

  try {
    const apiKey = process.env.SILICONFLOW_API_KEY
    if (!apiKey) throw new Error('SILICONFLOW_API_KEY not set')

    const sizeMap: Record<string, string> = {
      '1:1': '1024x1024', '16:9': '1024x576', '9:16': '576x1024',
    }

    // Kolors synchronous call — wait for generation to complete, get image URL directly
    const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Kwai-Kolors/Kolors',
        prompt: styledPrompt,
        image_size: sizeMap[aspectRatio || '1:1'] || '1024x1024',
        num_inference_steps: 25,
      }),
    })

    const data = await res.json()
    const imageUrl = data.images?.[0]?.url
    if (!imageUrl) throw new Error(data.message || 'No image returned')

    // Write to DB directly with completed status
    const gen = await db.generation.create({
      data: {
        userId: session.user.id,
        type: 'image_gen',
        prompt,
        resultImageUrl: imageUrl,
        creditsUsed: IMAGE_GEN_COST,
        mode: style || 'auto',
        status: 'completed',
      },
    })

    // Synchronous return: frontend doesn't need to poll, display result directly
    return NextResponse.json({
      generationId: gen.id,
      imageUrl,
      status: 'completed',
    })
  } catch (e) {
    await refundCredits(session.user.id, IMAGE_GEN_COST, 'generation_failed').catch(() => {})
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 })
  }
}
