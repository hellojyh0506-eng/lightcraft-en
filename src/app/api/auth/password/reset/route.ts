import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requestEmailCode, verifyEmailCode } from '@/lib/email-verify'
import { normalizeEmail } from '@/lib/email-normalize'
import { createRateLimiter } from '@/lib/rate-limit'
import { bodyTooLarge, getClientIp } from '@/lib/security'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const limiter = createRateLimiter({ windowMs: 60_000, maxHits: 5 })

// Two modes:
// 1. Send reset code: { email }
// 2. Reset password: { email, code, newPassword }
const sendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

const resetSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/, 'Please enter a 6-digit verification code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(64),
})

export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const ip = getClientIp(req)
  if (limiter.check(ip)) {
    return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
  }

  let body
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }

  // Mode 2: Reset password (has code + newPassword)
  if (body.code && body.newPassword) {
    const parsed = resetSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const email = normalizeEmail(parsed.data.email)
    const ok = await verifyEmailCode(email, parsed.data.code)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 })
    }

    // Update password — only for email-registered users with existing passwordHash
    const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })
    if (!user || !user.passwordHash) {
      // Don't reveal whether the account exists — generic success to prevent enumeration
      return NextResponse.json({ message: 'If an account exists with this email, the password has been reset' })
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ message: 'Password reset successful', success: true })
  }

  // Mode 1: Send reset code (only email)
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const email = normalizeEmail(parsed.data.email)

  // Check if user exists with a password — but always return success to prevent enumeration
  const user = await db.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } })
  if (!user || !user.passwordHash) {
    // Don't reveal non-existence — return success anyway (no email sent)
    return NextResponse.json({ message: 'If an account exists with this email, a verification code has been sent' })
  }

  try {
    await requestEmailCode(email, ip)
  } catch (err) {
    // Rate limiting errors from email-verify are user-facing
    const msg = err instanceof Error ? err.message : 'Failed to send verification code'
    return NextResponse.json({ error: msg }, { status: 429 })
  }

  return NextResponse.json({ message: 'If an account exists with this email, a verification code has been sent' })
}
