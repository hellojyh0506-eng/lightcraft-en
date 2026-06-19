import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createCheckout } from '@/lib/payment'
import { PLANS } from '@/lib/plans'

export async function POST(req: Request) {
  // 1. Auth — user must be logged in to purchase
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }

  // 2. Parse plan selection
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const planId = body?.planId
  const plan = PLANS.find(p => p.id === planId)
  if (!plan || !plan.creemProductId) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // 3. Create Creem checkout session → return URL for client redirect
  try {
    const origin = new URL(req.url).origin
    const checkoutUrl = await createCheckout({
      productId: plan.creemProductId,
      userId: session.user.id,
      planId: plan.id,
      successUrl: `${origin}/studio?payment=success`,
      cancelUrl: `${origin}/pricing?payment=cancelled`,
    })
    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error('Checkout creation failed:', err)
    return NextResponse.json(
      { error: 'Payment service unavailable. Please try again later.' },
      { status: 503 }
    )
  }
}
