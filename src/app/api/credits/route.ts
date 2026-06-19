import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/credits — Get balance + membership + check-in status
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  try {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, membership: true, lastDailyGrantAt: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const today = new Date().toDateString()
    const dailyClaimedToday = user.lastDailyGrantAt
      ? new Date(user.lastDailyGrantAt).toDateString() === today
      : false

    return NextResponse.json({ credits: user.credits, membership: user.membership, dailyClaimedToday })
  } catch (err) {
    console.error('Failed to fetch credits:', err)
    return NextResponse.json({ error: 'Failed to fetch credit information' }, { status: 500 })
  }
}

// POST /api/credits — Daily check-in (atomic operation to prevent race conditions)
export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const DAILY_AMOUNT = 3
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  try {
    const result = await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: session.user!.id!,
        membership: { in: ['starter', 'trial'] },
        OR: [
          { lastDailyGrantAt: null },
          { lastDailyGrantAt: { lt: todayStart } },
        ],
      },
      data: { credits: { increment: DAILY_AMOUNT }, lastDailyGrantAt: new Date() },
    })

    if (updated.count === 0) return null // Already claimed or not a free-tier user

    await tx.creditTransaction.create({
      data: { userId: session.user!.id!, amount: DAILY_AMOUNT, type: 'daily_free', reason: 'daily_free' },
    })

    const user = await tx.user.findUnique({ where: { id: session.user!.id! }, select: { credits: true } })
    return user?.credits ?? 0
    })

    if (result === null) {
      return NextResponse.json({ error: 'Already checked in today or check-in not available' }, { status: 400 })
    }
    return NextResponse.json({ credits: result })
  } catch (err) {
    console.error('Check-in failed:', err)
    return NextResponse.json({ error: 'Check-in failed, please try again later' }, { status: 500 })
  }
}
