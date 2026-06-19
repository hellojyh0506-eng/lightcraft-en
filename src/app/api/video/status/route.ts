import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { refundCredits } from '@/lib/credits'
import { bodyTooLarge } from '@/lib/security'
import { pollWithFallback } from '@/lib/orchestrator'
import { moderateVideo } from '@/lib/moderation'
import { type ModeId } from '@/lib/modes'
import { z } from 'zod'

// Only accepts generationId — requestId/engineUsed fetched from DB to prevent unauthorized access (IDOR)
const statusSchema = z.object({
  generationId: z.string().min(1),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  const userId = session.user.id

  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  const { generationId } = parsed.data

  // Verify ownership and fetch fallback polling info (don't trust client)
  const gen = await db.generation.findUnique({
    where: { id: generationId },
    select: {
      userId: true, status: true, creditsUsed: true, createdAt: true,
      requestId: true, engineUsed: true, mode: true, durationSec: true, prompt: true, inputImages: true,
    },
  })
  if (!gen || gen.userId !== userId) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  // Already completed/failed, return directly
  if (gen.status === 'completed' || gen.status === 'failed') {
    return NextResponse.json({
      status: gen.status,
      ...(gen.status === 'failed' ? { error: 'Generation failed, credits have been refunded' } : {}),
    })
  }

  // Server-side timeout detection — auto-refund if task is stuck beyond threshold (consistent with image/status)
  const VIDEO_STUCK_TIMEOUT_MS = 5 * 60 * 1000
  if (Date.now() - new Date(gen.createdAt).getTime() > VIDEO_STUCK_TIMEOUT_MS) {
    const transition = await db.generation.updateMany({
      where: { id: generationId, status: { in: ['pending', 'processing'] } },
      data: { status: 'failed', errorMsg: 'Generation timed out', inputImages: null },
    })
    if (transition.count === 1) {
      await refundCredits(userId, gen.creditsUsed, 'timeout', generationId).catch((e) =>
        console.error('Timeout refund failed (reconciliation needed):', e)
      )
    }
    return NextResponse.json({ status: 'failed', error: 'Generation timed out, credits have been refunded', refunded: transition.count === 1 })
  }

  if (!gen.requestId || !gen.engineUsed) {
    return NextResponse.json({ status: 'processing' })
  }

  // Poll via orchestrator (failed + has backup → auto-resubmit to next engine)
  const images: string[] = gen.inputImages ? JSON.parse(gen.inputImages) : []
  const r = await pollWithFallback(gen.mode as ModeId, gen.durationSec, gen.prompt, images, gen.engineUsed, gen.requestId)

  // Fallback degradation: engine/task changed → update record, still processing
  if (r.engineId !== gen.engineUsed || r.taskId !== gen.requestId) {
    await db.generation.update({
      where: { id: generationId },
      data: { engineUsed: r.engineId, requestId: r.taskId },
    })
  }

  if (r.status === 'completed' && r.videoUrl) {
    // Output moderation (compliance: video frame sampling)
    const vMod = await moderateVideo(r.videoUrl)
    if (!vMod.approved) {
      const t = await db.generation.updateMany({
        where: { id: generationId, status: { in: ['pending', 'processing'] } },
        data: { status: 'failed', moderationStatus: 'rejected', errorMsg: 'Output did not pass content moderation', inputImages: null },
      })
      if (t.count === 1) await refundCredits(userId, gen.creditsUsed, 'moderation_rejected', generationId).catch((e) => console.error('Moderation refund failed (reconciliation needed):', e))
      return NextResponse.json({ status: 'failed', error: 'Generated content did not pass moderation, credits have been refunded' })
    }
    await db.generation.update({
      where: { id: generationId },
      data: { status: 'completed', videoUrl: r.videoUrl, moderationStatus: 'approved', inputImages: null },
    })
    return NextResponse.json({ status: 'completed', videoUrl: r.videoUrl })
  }

  if (r.status === 'failed') {
    // Atomic state transition — only one refund (prevent concurrent duplicate refunds, uniqueness constraint as safety net)
    const transition = await db.generation.updateMany({
      where: { id: generationId, status: { in: ['pending', 'processing'] } },
      data: { status: 'failed', errorMsg: r.reason || 'Generation failed', inputImages: null },
    })
    if (transition.count === 1) {
      await refundCredits(userId, gen.creditsUsed, 'generation_failed', generationId).catch((e) => console.error('Refund failed (reconciliation needed):', e))
    }
    return NextResponse.json({ status: 'failed', error: 'Generation failed, credits have been refunded', refunded: transition.count === 1 })
  }

  // Still processing
  return NextResponse.json({ status: r.status, reason: r.reason })
}
