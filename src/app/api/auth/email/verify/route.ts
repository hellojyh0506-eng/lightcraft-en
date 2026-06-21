import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { verifyEmailCode } from '@/lib/email-verify'
import { bodyTooLarge } from '@/lib/security'
import { z } from 'zod'

const verifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Please enter a 6-digit verification code'),
})

// Verify email verification code — grants credits and activates Trial upon success
export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }
  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { db } = await import('@/lib/db')
  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.email) {
    return NextResponse.json({ error: 'No email associated with this account' }, { status: 400 })
  }
  if (user.emailVerified) {
    return NextResponse.json({ message: 'Email already verified', verified: true })
  }

  const ok = await verifyEmailCode(user.email, parsed.data.code)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
  }

  // Verification passed — grant 20 credits + activate 7-day Trial
  // Use updateMany + WHERE emailVerified=false as atomic guard to prevent concurrent double-granting
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 7)

  await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: user.id, emailVerified: false },
      data: {
        emailVerified: true,
        membership: 'trial',
        credits: { increment: 20 },
        trialEndsAt,
      },
    })
    if (updated.count === 0) return // Already verified by a concurrent request, skip
    await tx.creditTransaction.create({
      data: { userId: user.id, amount: 20, type: 'grant', reason: 'trial_signup' },
    })
    await tx.membershipRecord.create({
      data: { userId: user.id, plan: 'trial', startAt: new Date(), endAt: trialEndsAt, status: 'active' },
    })
  })

  return NextResponse.json({ message: 'Verification successful', verified: true })
}
