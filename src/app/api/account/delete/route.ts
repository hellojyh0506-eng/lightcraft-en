import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createRateLimiter } from '@/lib/rate-limit'
import { bodyTooLarge } from '@/lib/security'

const limiter = createRateLimiter({ windowMs: 3600_000, maxHits: 3 })

// Account deletion (statutory convenient deletion) — requires password confirmation (email users) to prevent stolen account one-click deletion
export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  const userId = session.user.id
  if (limiter.check(userId)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { password?: string } = {}
  try { body = await req.json() } catch { /* Phone users have no password, body can be empty */ }

  try {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true, passwordHash: true },
    })
    if (!u) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Email users must enter password for confirmation
    if (u.passwordHash) {
      if (!body.password) {
        return NextResponse.json({ error: 'Please enter your password to confirm account deletion' }, { status: 400 })
      }
      const valid = await bcrypt.compare(body.password, u.passwordHash)
      if (!valid) {
        return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
      }
    }

    await db.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: userId } }) // Cascade deletes Generation/credit transactions/membership records
      if (u.email) {
        await tx.loginAttempt.deleteMany({ where: { email: u.email } })
        await tx.emailVerificationCode.deleteMany({ where: { email: u.email } })
      }
      if (u.phone) await tx.verificationCode.deleteMany({ where: { phone: u.phone } })
    })
    return NextResponse.json({ message: 'Account deleted' })
  } catch (err) {
    console.error('Account deletion failed:', err)
    return NextResponse.json({ error: 'Account deletion failed, please try again later' }, { status: 500 })
  }
}
