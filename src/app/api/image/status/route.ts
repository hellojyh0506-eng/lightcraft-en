import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { refundCredits } from '@/lib/credits'
import { pollBgGen } from '@/lib/adapters/wanx-bg'
import { createRateLimiter } from '@/lib/rate-limit'
import { bodyTooLarge } from '@/lib/security'

const STUCK_TIMEOUT_MS = 5 * 60 * 1000
const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 60 })

export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  if (limiter.check(session.user.id)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { taskId?: string; generationId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }

  if (!body.generationId) {
    return NextResponse.json({ error: 'Missing generationId' }, { status: 400 })
  }

  const gen = await db.generation.findUnique({
    where: { id: body.generationId },
    select: { userId: true, requestId: true, status: true, creditsUsed: true, createdAt: true },
  })

  if (!gen || gen.userId !== session.user.id) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }

  if (gen.status === 'completed' || gen.status === 'failed') {
    return NextResponse.json({ status: gen.status })
  }

  // Timeout protection: auto-mark as failed and refund if processing exceeds 5 minutes
  if (Date.now() - new Date(gen.createdAt).getTime() > STUCK_TIMEOUT_MS) {
    const transition = await db.generation.updateMany({
      where: { id: body.generationId, userId: session.user.id, status: { in: ['pending', 'processing'] } },
      data: { status: 'failed', errorMsg: 'Generation timed out' },
    })
    if (transition.count === 1) {
      await refundCredits(session.user.id, gen.creditsUsed, 'timeout', body.generationId).catch((e) =>
        console.error('Timeout refund failed (reconciliation needed):', e)
      )
    }
    return NextResponse.json({ status: 'failed', reason: 'Generation timed out, credits have been refunded' })
  }

  if (!gen.requestId) {
    return NextResponse.json({ status: 'processing' })
  }

  try {
    const result = await pollBgGen(gen.requestId)

    if (result.status === 'completed' && result.imageUrls?.[0]) {
      await db.generation.updateMany({
        where: { id: body.generationId, userId: session.user.id, status: { not: 'completed' } },
        data: { status: 'completed', resultImageUrl: result.imageUrls[0] },
      })
    }

    if (result.status === 'failed') {
      const transition = await db.generation.updateMany({
        where: { id: body.generationId, userId: session.user.id, status: { in: ['pending', 'processing'] } },
        data: { status: 'failed', errorMsg: result.reason || 'Generation failed' },
      })
      if (transition.count === 1) {
        await refundCredits(session.user.id, gen.creditsUsed, 'generation_failed', body.generationId).catch((e) =>
          console.error('Refund failed (reconciliation needed):', e)
        )
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Query failed'
    return NextResponse.json({ status: 'processing', error: msg })
  }
}
