import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deductCredits, refundCredits, InsufficientCreditsError } from '@/lib/credits'
import { assertActiveMembership, MembershipError } from '@/lib/membership'
import { moderateText } from '@/lib/moderation'
import { bodyTooLarge } from '@/lib/security'
import { createRateLimiter } from '@/lib/rate-limit'
import { z } from 'zod'

const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 5 })

type EditOp = 'background' | 'cutout' | 'watermark' | 'enhance' | 'custom'
const OP_CREDITS: Record<EditOp, number> = { background: 3, cutout: 3, watermark: 3, enhance: 3, custom: 3 }

// Default prompt for each operation (used when user doesn't provide one)
const DEFAULT_PROMPTS: Record<string, string> = {
  background: 'Replace the background with a clean white, professional product photography style',
  cutout: 'Remove the background, keep only the subject, make the background pure white',
  watermark: 'Remove all watermarks, logos, and text overlays from the image while preserving original details',
  enhance: 'Enhance image quality, sharpen details, improve lighting and colors, make the image clearer and more professional',
  custom: '',
}

const editSchema = z.object({
  operation: z.enum(['background', 'cutout', 'watermark', 'enhance', 'custom']),
  image: z.string().min(1, 'Please upload an image').max(8_000_000, 'Image is too large').refine((v) => v.startsWith('data:image/'), 'Invalid image format'),
  prompt: z.string().max(500).optional(),
})

// Qwen-Image-Edit synchronous API — returns result directly, no polling needed
export async function POST(req: Request) {
  if (bodyTooLarge(req, 20 * 1024 * 1024)) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (limiter.check(session.user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request format' }, { status: 400 }) }

  const parsed = editSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { operation, image, prompt } = parsed.data

  // Membership access check
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { membership: true, trialEndsAt: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  try { assertActiveMembership(user) } catch (e) {
    if (e instanceof MembershipError) return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    throw e
  }

  if (prompt) {
    const mod = await moderateText(prompt)
    if (!mod.approved) return NextResponse.json({ error: `Content policy violation: ${mod.reason}` }, { status: 400 })
  }

  const cost = OP_CREDITS[operation]

  try {
    await deductCredits(session.user.id, cost, 'image_edit')
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, { status: 400 })
    }
    throw e
  }

  try {
    const apiKey = process.env.SILICONFLOW_API_KEY
    if (!apiKey) throw new Error('SILICONFLOW_API_KEY not set')

    const editPrompt = prompt || DEFAULT_PROMPTS[operation] || ''

    // Qwen-Image-Edit synchronous call
    const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen-Image-Edit',
        prompt: editPrompt,
        image,
        image_size: '1024x1024',
      }),
    })

    const data = await res.json()
    const imageUrl = data.images?.[0]?.url
    if (!imageUrl) throw new Error(data.message || 'No image returned')

    // Write directly with completed status
    const gen = await db.generation.create({
      data: {
        userId: session.user.id,
        type: 'image_edit',
        prompt: editPrompt,
        resultImageUrl: imageUrl,
        creditsUsed: cost,
        mode: operation,
        status: 'completed',
      },
    })

    return NextResponse.json({
      generationId: gen.id,
      imageUrl,
      status: 'completed',
    })
  } catch {
    await refundCredits(session.user.id, cost, 'generation_failed').catch((e) =>
      console.error('Refund failed after image edit error (reconciliation needed):', e)
    )
    return NextResponse.json({ error: 'Image editing failed, please try again' }, { status: 500 })
  }
}
