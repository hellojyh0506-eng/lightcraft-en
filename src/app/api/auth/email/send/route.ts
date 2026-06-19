import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { requestEmailCode, EmailVerifyError } from '@/lib/email-verify'
import { getClientIp, bodyTooLarge } from '@/lib/security'

// Send email verification code — only callable by logged-in users with unverified email
export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  // Fetch user from DB (session doesn't contain emailVerified)
  const { db } = await import('@/lib/db')
  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.email) {
    return NextResponse.json({ error: 'No email associated with this account' }, { status: 400 })
  }
  if (user.emailVerified) {
    return NextResponse.json({ error: 'Email already verified' }, { status: 400 })
  }

  try {
    const ip = getClientIp(req)
    await requestEmailCode(user.email, ip)
    return NextResponse.json({ message: 'Verification code sent' })
  } catch (err) {
    if (err instanceof EmailVerifyError) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }
    console.error('Email verification code sending error:', err)
    return NextResponse.json({ error: 'Failed to send, please try again later' }, { status: 500 })
  }
}
