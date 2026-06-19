import { db } from './db'
import { randomInt } from 'crypto'

// Email verification code — verify email ownership after sign-up. Structure mirrors sms.ts, rate limiting is database-based.
const CODE_TTL_MS = 10 * 60 * 1000    // Verification code valid for 10 minutes (email delivery is slower than SMS)
const SEND_COOLDOWN_MS = 60 * 1000     // 60-second cooldown per email
const MAX_PER_EMAIL_HOUR = 5           // Max per email per hour
const MAX_PER_IP_HOUR = 10             // Max per IP per hour
const MAX_VERIFY_ATTEMPTS = 5          // Max failed verification attempts per code

export class EmailVerifyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailVerifyError'
  }
}

/**
 * Send verification code email via Resend.
 * In development without RESEND_API_KEY, prints to console.
 */
async function sendVerificationEmail(email: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'LightCraft <onboarding@resend.dev>'

  // Development fallback — print to console when API Key is not configured
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[EMAIL:dev] Sending verification code to ${email}: ${code} (RESEND_API_KEY not configured, dev placeholder only)`)
      return
    }
    throw new EmailVerifyError('Email service is not configured. Please email support@dflow.top')
  }

  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject: `${code} is your verification code — LightCraft`,
    html: buildEmailHtml(code),
  })

  if (error) {
    console.error('[EMAIL] Send failed:', error)
    throw new EmailVerifyError('Failed to send verification code. Please try again later')
  }
}

/** Build verification email HTML — clean branded style */
function buildEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:420px;margin:40px auto;padding:32px;background:#141414;border-radius:12px;border:1px solid #262626">
    <h2 style="margin:0 0 8px;color:#c8a45a;font-size:18px;font-weight:500;letter-spacing:2px">LightCraft</h2>
    <p style="margin:0 0 24px;color:#888;font-size:13px">Email Verification</p>
    <p style="margin:0 0 16px;color:#e5e5e5;font-size:14px;line-height:1.6">Hi, your email verification code is:</p>
    <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:16px;text-align:center;margin:0 0 16px">
      <span style="font-size:32px;font-weight:600;letter-spacing:8px;color:#c8a45a">${code}</span>
    </div>
    <p style="margin:0 0 4px;color:#888;font-size:12px">This code is valid for 10 minutes. Please enter it promptly.</p>
    <p style="margin:0;color:#555;font-size:12px">If you did not sign up for LightCraft, please ignore this email.</p>
  </div>
</body>
</html>`
}

/**
 * Generate and send email verification code (with rate limiting). Throws EmailVerifyError on failure.
 */
export async function requestEmailCode(email: string, ip?: string): Promise<void> {
  const now = Date.now()

  // Cooldown: reject if sent within last 60 seconds
  const recent = await db.emailVerificationCode.findFirst({
    where: { email, createdAt: { gte: new Date(now - SEND_COOLDOWN_MS) } },
    orderBy: { createdAt: 'desc' },
  })
  if (recent) throw new EmailVerifyError('Sending too frequently. Please wait 60 seconds')

  // Per-email hourly limit
  const emailCount = await db.emailVerificationCode.count({
    where: { email, createdAt: { gte: new Date(now - 3600_000) } },
  })
  if (emailCount >= MAX_PER_EMAIL_HOUR) {
    throw new EmailVerifyError('Too many verification codes sent. Please try again later')
  }

  // Per-IP hourly limit
  if (ip && ip !== 'unknown') {
    const ipCount = await db.emailVerificationCode.count({
      where: { ip, createdAt: { gte: new Date(now - 3600_000) } },
    })
    if (ipCount >= MAX_PER_IP_HOUR) throw new EmailVerifyError('Too many requests. Please try again later')
  }

  const code = randomInt(100000, 1000000).toString()
  await db.emailVerificationCode.create({
    data: { email, code, ip, expiresAt: new Date(now + CODE_TTL_MS) },
  })
  await sendVerificationEmail(email, code)
}

/**
 * Verify email code and consume it (one-time use). Returns true on success.
 * Anti-brute-force logic mirrors sms.ts verifyCode.
 */
export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  const rec = await db.emailVerificationCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gte: new Date() } },
    orderBy: { createdAt: 'desc' },
  })
  if (!rec) return false

  if (rec.attempts >= MAX_VERIFY_ATTEMPTS) {
    await db.emailVerificationCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } })
    return false
  }

  if (rec.code === code) {
    await db.emailVerificationCode.update({ where: { id: rec.id }, data: { consumedAt: new Date() } })
    return true
  }

  await db.emailVerificationCode.update({ where: { id: rec.id }, data: { attempts: { increment: 1 } } })
  return false
}
