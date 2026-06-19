import { db } from './db'

// Credit operations — uses conditional update for atomicity, preventing concurrent over-deduction

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits')
    this.name = 'InsufficientCreditsError'
  }
}

/**
 * Atomically deduct credits.
 * Uses WHERE credits >= amount conditional update, concurrency-safe — never goes negative.
 * Also records a credit transaction log. Throws InsufficientCreditsError on failure.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  reason: string,
  relatedId?: string
): Promise<number> {
  return await db.$transaction(async (tx) => {
    // Conditional update: only deduct when balance is sufficient (atomic, prevents concurrent over-deduction)
    const result = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    })

    if (result.count === 0) {
      throw new InsufficientCreditsError()
    }

    // Record transaction log
    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: 'consume',
        reason,
        relatedId,
      },
    })

    // Return balance after deduction
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    return user?.credits ?? 0
  })
}

/**
 * Refund credits (called when generation fails).
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  relatedId?: string
): Promise<void> {
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
    })
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type: 'refund',
        reason,
        relatedId,
      },
    })
  })
}

/**
 * Get user's current credit balance.
 */
export async function getCredits(userId: string): Promise<number> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })
  return user?.credits ?? 0
}
