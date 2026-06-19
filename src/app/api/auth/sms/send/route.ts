import { NextResponse } from 'next/server'
import { getClientIp, bodyTooLarge } from '@/lib/security'
import { requestVerificationCode, SmsError } from '@/lib/sms'
import { z } from 'zod'

// Send phone login verification code — rate limiting in sms.ts (DB-level), honeypot added here
const schema = z.object({
  phone: z.string().min(1),
  website: z.string().optional(), // Honeypot field: normal users leave this empty
})

export async function POST(req: Request) {
  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
  }
  const { phone, website } = parsed.data

  // Honeypot: bot filled the hidden field → silently return success without actually sending
  if (website && website.trim() !== '') {
    return NextResponse.json({ message: 'Verification code sent' })
  }

  try {
    await requestVerificationCode(phone, getClientIp(req))
    return NextResponse.json({ message: 'Verification code sent' })
  } catch (err) {
    if (err instanceof SmsError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('Failed to send verification code:', err)
    return NextResponse.json({ error: 'Failed to send, please try again later' }, { status: 500 })
  }
}
