// Plan configuration — shared by pricing page, studio, and account
// Credit rules: cost per quality tier × duration (see modes.ts). AI polish is free.

export const AI_POLISH_COST_CREDITS = 0 // Polish is free

export type PlanId = 'starter' | 'trial' | 'pro' | 'max' | 'ultra'

export interface Plan {
  id: PlanId
  name: string
  price: number          // USD monthly price
  credits: number
  creemProductId: string // Creem dashboard product ID — fill after creating products in Creem
  recommended?: boolean
  features: { label: string; included: boolean }[]
}

export const PLANS: Plan[] = [
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    credits: 400,
    creemProductId: 'prod_7Wv0Y8wISvn8lnsDJ7VNEa',
    features: [
      { label: 'Edit · Generate · Create videos', included: true },
      { label: 'Standard + Audio + Transition modes', included: true },
      { label: '720p HD export', included: true },
      { label: 'No watermark', included: true },
      { label: '400 credits / month', included: true },
      { label: 'Premium 1080p', included: false },
      { label: 'Priority queue', included: false },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    price: 19,
    credits: 900,
    creemProductId: 'prod_2Rpwfj4SYkr1uH6WZBjDnx',
    recommended: true,
    features: [
      { label: 'Edit · Generate · Create videos', included: true },
      { label: 'Standard + Audio + Transition modes', included: true },
      { label: '720p HD export', included: true },
      { label: 'No watermark', included: true },
      { label: 'Batch processing', included: true },
      { label: '900 credits / month', included: true },
      { label: 'Premium 1080p', included: false },
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    price: 39,
    credits: 1500,
    creemProductId: 'prod_6GvYoiOWMwSNJehFudCRFY',
    features: [
      { label: 'Edit · Generate · Create videos', included: true },
      { label: 'All quality tiers + Premium 1080p', included: true },
      { label: '15-second long videos', included: true },
      { label: 'Priority generation queue', included: true },
      { label: 'Batch processing + Priority support', included: true },
      { label: '1,500 credits / month', included: true },
    ],
  },
]

// Membership display labels (used in account page, navbar, etc.)
export const MEMBERSHIP_LABELS: Record<PlanId, { label: string; color: string }> = {
  starter: { label: 'Free', color: 'text-noir-300' },
  trial: { label: 'Trial', color: 'text-gold-400' },
  pro: { label: 'Pro', color: 'text-gold-400' },
  max: { label: 'Max', color: 'text-gold-300' },
  ultra: { label: 'Ultra', color: 'text-gold-200' },
}
