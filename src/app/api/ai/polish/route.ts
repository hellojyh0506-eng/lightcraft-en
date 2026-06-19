import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { polishPrompt, type PolishContext } from '@/lib/siliconflow'
import { bodyTooLarge } from '@/lib/security'
import { z } from 'zod'

const polishSchema = z.object({
  prompt: z.string().min(1, 'Please enter a prompt first').max(500, 'Prompt is too long'),
  context: z.enum(['edit_background', 'edit_custom', 'generate', 'video']).optional(),
})

// In-process rate limiting (sufficient for single-process deployment) — max 30 per user per day, prevent "free polish" from burning LLM budget
const polishMap = new Map<string, number[]>()
function withinPolishLimit(userId: string): boolean {
  const now = Date.now()
  const ts = (polishMap.get(userId) || []).filter((t) => now - t < 24 * 3600_000)
  if (ts.length >= 30) return false
  ts.push(now)
  polishMap.set(userId, ts)
  return true
}

export async function POST(req: Request) {
  // AI polish is free (conversion assist), only requires sign-in + rate limiting
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  if (!withinPolishLimit(session.user.id)) {
    return NextResponse.json({ error: 'Daily polish limit reached, please try again tomorrow', code: 'RATE_LIMITED' }, { status: 429 })
  }

  if (bodyTooLarge(req, 8_192)) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
  }
  const parsed = polishSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const polished = await polishPrompt(parsed.data.prompt, (parsed.data.context as PolishContext) || 'video')
    return NextResponse.json({ polished })
  } catch (err) {
    console.error('Polish failed:', err)
    return NextResponse.json({ error: 'AI polish failed, please try again' }, { status: 500 })
  }
}
