// Creem payment integration — Merchant of Record
// Creem handles tax, compliance, and global card processing
// Docs: https://creem.io/docs
//
// NOTE: Fields marked TODO need verification against Creem's actual API docs.
// The integration pattern (checkout → redirect → webhook → grant) is universal
// across MoR providers (Stripe/Paddle/Lemon Squeezy all use the same shape).

import crypto from 'crypto'

const CREEM_API_BASE = process.env.CREEM_API_BASE || 'https://api.creem.io/v1'

function getApiKey(): string {
  const key = process.env.CREEM_API_KEY
  if (!key) throw new Error('CREEM_API_KEY not configured')
  return key
}

function getWebhookSecret(): string {
  const secret = process.env.CREEM_WEBHOOK_SECRET
  if (!secret) throw new Error('CREEM_WEBHOOK_SECRET not configured')
  return secret
}

export interface CheckoutOptions {
  productId: string  // Creem product ID (created in Creem dashboard)
  userId: string     // Our internal user ID (passed as custom data, returned in webhook)
  planId: string     // Our plan ID (pro/max/ultra)
  successUrl: string
  cancelUrl: string
}

/**
 * Create a Creem checkout session.
 * Returns the hosted checkout URL to redirect the user to.
 *
 * TODO: Verify exact Creem API endpoint and request shape from their docs.
 */
export async function createCheckout(opts: CheckoutOptions): Promise<string> {
  const res = await fetch(`${CREEM_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: opts.productId,
      success_url: opts.successUrl,
      // Custom data — returned in webhook to identify the buyer + plan
      custom_data: {
        user_id: opts.userId,
        plan_id: opts.planId,
      },
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Creem checkout creation failed ${res.status}: ${body}`)
  }

  const data = await res.json()
  // TODO: Verify the response field name from Creem docs (could be checkout_url, url, etc.)
  const checkoutUrl = data.checkout_url || data.url
  if (!checkoutUrl) throw new Error('Creem did not return a checkout URL')
  return checkoutUrl
}

/**
 * Verify Creem webhook signature (HMAC-SHA256).
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * TODO: Verify exact header name and signing scheme from Creem docs.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = getWebhookSecret()
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // Timing-safe comparison — prevents timing attacks on signature
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  } catch {
    return false // Length mismatch
  }
}

/**
 * Parse custom_data from a Creem webhook event.
 * Returns the userId and planId we passed during checkout creation.
 */
export function parseCustomData(event: Record<string, unknown>): { userId: string; planId: string } | null {
  // TODO: Verify exact event structure from Creem docs
  const custom = (event?.data as Record<string, unknown>)?.custom_data as Record<string, string> | undefined
    || event?.custom_data as Record<string, string> | undefined
  if (!custom?.user_id || !custom?.plan_id) return null
  return { userId: custom.user_id, planId: custom.plan_id }
}
