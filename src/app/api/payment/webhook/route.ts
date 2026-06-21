import { verifyWebhookSignature, parseCustomData } from '@/lib/payment'
import { db } from '@/lib/db'
import { PLANS } from '@/lib/plans'

/**
 * Creem webhook handler — processes payment events.
 *
 * Pattern (universal across MoR): verify signature → parse event → idempotent grant.
 * The CreditTransaction @@unique([relatedId, type]) constraint prevents double-granting
 * even if Creem retries the webhook.
 *
 * TODO: Verify exact Creem event types and signature header from their docs.
 */
export async function POST(req: Request) {
  // 1. Read raw body for signature verification (must NOT parse JSON first)
  const rawBody = await req.text()

  // TODO: Verify exact header name from Creem docs
  const signature = req.headers.get('x-creem-signature')
    || req.headers.get('creem-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('Webhook signature verification failed')
    return new Response('Invalid signature', { status: 401 })
  }

  // 2. Parse event
  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // 3. Handle checkout/payment completion
  // TODO: Verify exact event type string from Creem docs
  const eventType = (event.type || event.event_type) as string
  if (eventType === 'checkout.completed' || eventType === 'order.paid') {
    const custom = parseCustomData(event)
    if (!custom) {
      console.error('Webhook missing custom_data:', JSON.stringify(event).slice(0, 300))
      return new Response('Missing custom data', { status: 400 })
    }

    const { userId, planId } = custom
    const plan = PLANS.find(p => p.id === planId)
    if (!plan) {
      console.error('Unknown plan in webhook:', planId)
      return new Response('Unknown plan', { status: 400 })
    }

    // Event ID for idempotency — prevents double-granting on webhook retry
    const eventId = (event.id || event.event_id) as string | undefined
    if (!eventId) {
      console.error('Webhook missing event ID — cannot guarantee idempotency, rejecting:', JSON.stringify(event).slice(0, 300))
      return new Response('Missing event ID', { status: 400 })
    }

    try {
      await db.$transaction(async (tx) => {
        // Idempotency: CreditTransaction has @@unique([relatedId, type])
        const exists = await tx.creditTransaction.findFirst({
          where: { relatedId: eventId, type: 'grant' },
        })
        if (exists) return // Already processed — skip silently

        // Verify user exists (could have been deleted between checkout and webhook)
        const user = await tx.user.findUnique({ where: { id: userId } })
        if (!user) {
          console.warn('Webhook for deleted user:', userId)
          return // Skip gracefully, return 200 to stop retries
        }

        // Grant credits + upgrade membership
        await tx.user.update({
          where: { id: userId },
          data: {
            credits: { increment: plan.credits },
            membership: planId,
          },
        })

        // Log credit transaction for audit trail
        await tx.creditTransaction.create({
          data: {
            userId,
            amount: plan.credits,
            type: 'grant',
            reason: 'purchase',
            relatedId: eventId,
          },
        })

        // Record membership period (30 days)
        const endAt = new Date()
        endAt.setDate(endAt.getDate() + 30)
        await tx.membershipRecord.create({
          data: {
            userId,
            plan: planId,
            endAt,
            status: 'active',
          },
        })
      })

      console.log(`Payment processed: user=${userId} plan=${planId} credits=+${plan.credits}`)
    } catch (err) {
      console.error('Webhook grant failed:', err)
      // Return 500 so Creem retries — idempotency protects against double-grant
      return new Response('Processing error', { status: 500 })
    }
  }

  // Acknowledge all events (even ones we don't handle) to prevent retries
  return new Response('OK', { status: 200 })
}
