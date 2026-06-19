import { db } from './db'

// Daily free credits — granted to free users once per day, with global budget circuit breaker (prevent bleeding).
// 3 credits/day x 30 = 90/month, well below Pro 400/month -> clear upgrade incentive for paid plans
const DAILY_FREE_CREDITS = 3

// Read env inside function (easier for testing and runtime adjustment); 0 = unlimited (dev)
function dailyFreeBudget(): number {
  return Number(process.env.DAILY_FREE_BUDGET ?? 0)
}

function todayStart(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Grant free credits to free users once per day.
 * - Conditional update (lastDailyGrantAt < today midnight) ensures "once per day", concurrency-safe.
 * - Global daily budget circuit breaker: stops granting when daily free grants reach the limit.
 */
export async function grantDailyFreeIfDue(userId: string): Promise<void> {
  const budget = dailyFreeBudget()
  // Budget check + grant in same transaction, serialized to prevent concurrent breach of global daily budget (TOCTOU race)
  await db.$transaction(async (tx) => {
    if (budget > 0) {
      const todayGrants = await tx.creditTransaction.count({
        where: { type: 'daily_free', createdAt: { gte: todayStart() } },
      })
      if (todayGrants >= budget) return // Circuit breaker triggered
    }

    const r = await tx.user.updateMany({
      where: { id: userId, OR: [{ lastDailyGrantAt: null }, { lastDailyGrantAt: { lt: todayStart() } }] },
      data: { lastDailyGrantAt: new Date(), credits: { increment: DAILY_FREE_CREDITS } },
    })
    if (r.count === 1) {
      await tx.creditTransaction.create({
        data: { userId, amount: DAILY_FREE_CREDITS, type: 'daily_free', reason: 'daily_free' },
      })
    }
  })
}
