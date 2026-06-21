import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deductCredits, refundCredits, InsufficientCreditsError } from '@/lib/credits'
import { assertActiveMembership, MembershipError } from '@/lib/membership'
import { moderateText } from '@/lib/moderation'
import { createRateLimiter } from '@/lib/rate-limit'
import { bodyTooLarge } from '@/lib/security'
import { TTS_CREDIT_COST, TTS_MODEL } from '@/lib/voiceover'
import { z } from 'zod'

const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 10 })

const ttsSchema = z.object({
  script: z.string().min(1, 'Please enter a script').max(2000, 'Script is too long (max 2000 chars)'),
  voice: z.enum(['alex', 'benjamin', 'claire', 'david']),
})

export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (limiter.check(session.user.id)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request format' }, { status: 400 }) }

  const parsed = ttsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  const { script, voice } = parsed.data

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { membership: true, trialEndsAt: true } })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  try { assertActiveMembership(user) } catch (e) {
    if (e instanceof MembershipError) return NextResponse.json({ error: e.message, code: e.code }, { status: 403 })
    throw e
  }

  const mod = await moderateText(script)
  if (!mod.approved) return NextResponse.json({ error: `Content policy violation: ${mod.reason}` }, { status: 400 })

  try {
    await deductCredits(session.user.id, TTS_CREDIT_COST, 'tts_gen')
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, { status: 400 })
    }
    throw e
  }

  try {
    const apiKey = process.env.SILICONFLOW_API_KEY
    if (!apiKey) throw new Error('SILICONFLOW_API_KEY not set')

    const res = await fetch('https://api.siliconflow.cn/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: script,
        voice: `${TTS_MODEL}:${voice}`,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || `TTS API error: ${res.status}`)
    }

    const audioBuffer = await res.arrayBuffer()
    if (audioBuffer.byteLength < 100) throw new Error('Empty audio response')

    const base64 = Buffer.from(audioBuffer).toString('base64')

    return NextResponse.json({ audio: base64, creditsUsed: TTS_CREDIT_COST })
  } catch {
    await refundCredits(session.user.id, TTS_CREDIT_COST, 'tts_failed').catch(() => {})
    return NextResponse.json({ error: 'Voice generation failed, credits refunded' }, { status: 500 })
  }
}
