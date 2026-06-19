import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { getClientIp, checkRegisterRateLimit, bodyTooLarge } from '@/lib/security'
import { normalizeEmail } from '@/lib/email-normalize'
import { requestEmailCode } from '@/lib/email-verify'

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Please enter a username').max(50).optional(),
  website: z.string().optional(), // Honeypot field — normal users should leave this empty
  consent: z.boolean().refine((v) => v === true, 'Please read and agree to the Terms of Service and Privacy Policy'),
})

export async function POST(req: Request) {
  if (bodyTooLarge(req, 16_384)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { password, name, website } = parsed.data
    // Email normalization — prevent Gmail dot/+suffix, Foxmail→QQ variants from bypassing uniqueness checks to farm credits
    const email = normalizeEmail(parsed.data.email)

    // 1. Honeypot detection — bots fill hidden fields, reject silently
    if (website && website.trim() !== '') {
      // Silent rejection, don't reveal the real reason to bots
      return NextResponse.json({ message: 'Registration successful' }, { status: 201 })
    }

    // 1.5 Disposable email blocking — prevent batch registrations with temp emails to farm credits
    const emailDomain = email.split('@')[1]
    const disposableDomains = new Set([
      'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
      'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'sharklasers.com',
      'guerrillamailblock.com', 'grr.la', 'dispostable.com', 'yopmail.com',
      'trashmail.com', 'mohmal.com', 'tempail.com', 'emailondeck.com',
      'getnada.com', 'maildrop.cc', 'mailnesia.com', 'tempr.email',
      'burnermail.io', 'discard.email', 'mailcatch.com', 'inboxbear.com',
    ])
    if (disposableDomains.has(emailDomain)) {
      return NextResponse.json({ error: 'Disposable email addresses are not supported' }, { status: 400 })
    }

    // 1.6 Email domain MX validation — reject non-existent fake email domains
    try {
      const { resolveMx } = await import('dns/promises')
      const mx = await resolveMx(emailDomain)
      if (!mx || mx.length === 0) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // 2. IP rate limiting — prevent malicious batch registrations
    const ip = getClientIp(req)
    const rateLimited = await checkRegisterRateLimit(ip)
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many registration attempts, please try again later' },
        { status: 429 }
      )
    }

    // 3. Check if email is already registered (using normalized email)
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      )
    }

    // 4. Create user — credits=0, unverified; credits and Trial granted after verification
    const passwordHash = await bcrypt.hash(password, 12)

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name: name || email.split('@')[0],
        emailVerified: false,
        membership: 'starter', // Upgraded to trial after verification
        credits: 0,            // 50 credits granted after verification
        registerIp: ip,
        consentAt: new Date(),
      },
    })

    // 5. Auto-send email verification code (failure doesn't block registration; user can resend on verification page)
    try {
      await requestEmailCode(email, ip)
    } catch (err) {
      console.warn('Failed to auto-send verification code after registration:', err)
    }

    return NextResponse.json(
      { message: 'Registration successful, please verify your email', userId: user.id, needsVerification: true },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed, please try again later' },
      { status: 500 }
    )
  }
}
