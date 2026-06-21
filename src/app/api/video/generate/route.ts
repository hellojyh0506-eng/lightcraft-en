import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deductCredits, refundCredits, InsufficientCreditsError } from '@/lib/credits'
import type { PlanId } from '@/lib/plans'
import { getMode, getModeDuration, type ModeId } from '@/lib/modes'
import { getEngine } from '@/lib/engines'
import { submitWithFallback } from '@/lib/orchestrator'
import { grantDailyFreeIfDue } from '@/lib/daily-credits'
import { moderateText, moderateImage } from '@/lib/moderation'
import { z } from 'zod'
import { bodyTooLarge } from '@/lib/security'

// data URI size cap (chars) — Vercel serverless body limit ~4.5MB; base64 inflates ~33%
const MAX_IMAGE_PAYLOAD = 3_500_000

const generateSchema = z.object({
  mode: z.enum(['standard', 'voice', 'premium', 'transition']),
  durationSec: z.number().int().min(5).max(15),
  images: z
    .array(
      z
        .string()
        .min(1)
        .max(MAX_IMAGE_PAYLOAD, 'Image is too large, please compress and try again')
        .refine((v) => v.startsWith('data:image/'), 'Invalid image format')
    )
    .min(1, 'Please provide an image')
    .max(2),
  prompt: z.string().min(1, 'Please enter a prompt').max(1000, 'Prompt is too long'),
})

// DB-level rate limiting (multi-instance safe) — max 5 generations per user per minute
async function withinGenerateRateLimit(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000)
  const count = await db.generation.count({ where: { userId, createdAt: { gte: since } } })
  return count < 5
}

export async function POST(req: Request) {
  // 1. Authentication
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  const userId = session.user.id

  // 2. Rate limiting
  if (!(await withinGenerateRateLimit(userId))) {
    return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
  }

  // 3. Early reject oversized body (prevent large body buffering from exhausting memory) + input validation
  if (bodyTooLarge(req, 4_000_000)) { // Vercel serverless ~4.5MB body limit
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }
  const { mode: modeId, durationSec, images, prompt } = parsed.data as {
    mode: ModeId
    durationSec: number
    images: string[]
    prompt: string
  }

  // 3.1 Required number of images per mode (single image=1, transition=2)
  const mode = getMode(modeId)
  const needImages = mode.capability === 'kf2v' ? 2 : 1
  if (images.length !== needImages) {
    return NextResponse.json({ error: `This mode requires ${needImages} image(s)` }, { status: 400 })
  }

  // 3.2 Duration validation + credits
  let dur
  try {
    dur = getModeDuration(modeId, durationSec)
  } catch {
    return NextResponse.json({ error: 'Unsupported duration' }, { status: 400 })
  }

  // 3.3 Pre-deduction guard: primary engine needs DASHSCOPE but not configured → fail-fast without deducting
  const primaryEngine = getEngine(mode.primary)
  if (primaryEngine.provider === 'bailian' && !process.env.DASHSCOPE_API_KEY) {
    return NextResponse.json({ error: 'Video service not configured, please try again later', code: 'SERVICE_UNAVAILABLE' }, { status: 503 })
  }

  // 3.4 Content moderation (input) — prompt + all images, compliance gate
  const textMod = await moderateText(prompt)
  if (!textMod.approved) {
    return NextResponse.json({ error: 'Your prompt contains prohibited content, please revise and try again', code: 'MODERATION_REJECTED' }, { status: 400 })
  }
  for (const img of images) {
    const im = await moderateImage(img)
    if (!im.approved) {
      return NextResponse.json({ error: 'Image did not pass content moderation, please use a different image', code: 'MODERATION_REJECTED' }, { status: 400 })
    }
  }

  // 4. Membership gate + daily free credits
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { membership: true, trialEndsAt: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  const membership = user.membership as PlanId

  // Re-resolve duration with membership to get tier-specific credit cost
  try {
    dur = getModeDuration(modeId, durationSec, membership)
  } catch {
    return NextResponse.json({ error: 'Unsupported duration' }, { status: 400 })
  }
  const creditCost = dur.creditCost

  if (!dur.tierAccess.includes(membership)) {
    return NextResponse.json({ error: 'This quality tier/duration requires a membership upgrade', code: 'TIER_LOCKED' }, { status: 403 })
  }
  // Free tier (free users / expired trial) daily free grant
  const isFreeTier =
    membership === 'starter' ||
    (membership === 'trial' && !!user.trialEndsAt && user.trialEndsAt.getTime() < Date.now())
  if (isFreeTier) {
    await grantDailyFreeIfDue(userId)
  }

  // 5. Create record + atomic credit deduction
  let generationId: string | undefined
  try {
    const generation = await db.generation.create({
      data: {
        userId,
        prompt,
        imageKey: 'inline',
        inputImages: JSON.stringify(images), // Kept for disaster recovery replay, cleared at terminal state
        mode: modeId,
        durationSec,
        status: 'pending',
        moderationStatus: 'approved', // Input already approved; output moderation happens at status completion
        creditsUsed: creditCost,
      },
    })
    generationId = generation.id
    await deductCredits(userId, creditCost, 'video_gen', generationId)
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      if (generationId) {
        await db.generation.delete({ where: { id: generationId } }).catch(() => {})
      }
      return NextResponse.json(
        { error: 'Insufficient credits, please top up or upgrade your plan', code: 'INSUFFICIENT_CREDITS' },
        { status: 402 }
      )
    }
    // Non-credit errors (e.g. DB connection) — clean up orphaned record, no refund needed (credits weren't deducted)
    if (generationId) {
      await db.generation.update({ where: { id: generationId }, data: { status: 'failed', errorMsg: 'System error' } }).catch(() => {})
    }
    throw err
  }

  // 6. Submit via orchestrator (auto-fallback to next engine if primary fails)
  try {
    const { taskId, engineId, fallbackIndex } = await submitWithFallback(modeId, durationSec, prompt, images)
    await db.generation.update({
      where: { id: generationId },
      data: { status: 'processing', requestId: taskId, engineUsed: engineId, fallbackIndex },
    })
    return NextResponse.json({ generationId, creditsUsed: creditCost })
  } catch (err) {
    // All engines failed — atomically claim status (pending/processing→failed) then refund;
    // ensures even if refund throws (e.g. SQLite write lock) the record is already failed and won't be stuck pending; refund failures logged for reconciliation.
    console.error('Video submission failed:', err)
    const transition = await db.generation
      .updateMany({
        where: { id: generationId, status: { in: ['pending', 'processing'] } },
        data: { status: 'failed', errorMsg: (err as Error).message, inputImages: null },
      })
      .catch(() => ({ count: 0 }))
    let refunded = false
    if (transition.count === 1) {
      await refundCredits(userId, creditCost, 'submit_failed', generationId).then(() => { refunded = true }).catch((e) =>
        console.error('Refund failed (reconciliation needed):', e)
      )
    }
    return NextResponse.json({
      error: refunded ? 'Generation failed, credits have been refunded. Please try again later' : 'Generation failed. If credits were not refunded, please email support@dflow.top',
    }, { status: 500 })
  }
}
