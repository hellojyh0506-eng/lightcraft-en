import { describe, it, expect } from 'vitest'
import { normalizeEmail } from '@/lib/email-normalize'
import { PLANS, MEMBERSHIP_LABELS, type PlanId } from '@/lib/plans'
import { verifyWebhookSignature, parseCustomData } from '@/lib/payment'
import { isValidPhone } from '@/lib/sms'
import crypto from 'crypto'

// ─── Email Normalization ──────────────────────────────────────────────────────

describe('normalizeEmail', () => {
  it('lowercases and trims', () => {
    expect(normalizeEmail('  User@Example.COM  ')).toBe('user@example.com')
  })

  it('strips Gmail dots and + suffix', () => {
    expect(normalizeEmail('j.o.h.n+spam@gmail.com')).toBe('john@gmail.com')
  })

  it('normalizes googlemail.com to gmail.com', () => {
    expect(normalizeEmail('john+test@googlemail.com')).toBe('john@gmail.com')
  })

  it('normalizes foxmail.com to qq.com', () => {
    expect(normalizeEmail('user+tag@foxmail.com')).toBe('user@qq.com')
  })

  it('strips + suffix for qq.com', () => {
    expect(normalizeEmail('12345+junk@qq.com')).toBe('12345@qq.com')
  })

  it('strips + suffix for outlook/hotmail/live but keeps dots', () => {
    expect(normalizeEmail('j.doe+news@outlook.com')).toBe('j.doe@outlook.com')
    expect(normalizeEmail('j.doe+news@hotmail.com')).toBe('j.doe@hotmail.com')
    expect(normalizeEmail('user+x@live.cn')).toBe('user@live.cn')
  })

  it('leaves unknown domains untouched (except lowercase)', () => {
    expect(normalizeEmail('User+Tag@MyDomain.org')).toBe('user+tag@mydomain.org')
  })

  it('handles missing @ gracefully', () => {
    expect(normalizeEmail('noatsign')).toBe('noatsign')
  })
})

// ─── Plans Configuration ──────────────────────────────────────────────────────

describe('plans', () => {
  it('has exactly 3 paid plans (pro, max, ultra)', () => {
    expect(PLANS).toHaveLength(3)
    expect(PLANS.map(p => p.id)).toEqual(['pro', 'max', 'ultra'])
  })

  it('prices are in USD', () => {
    const prices = PLANS.map(p => p.price)
    expect(prices).toEqual([9, 19, 39])
  })

  it('every plan has a Creem product ID', () => {
    for (const plan of PLANS) {
      expect(plan.creemProductId).toBeTruthy()
      expect(plan.creemProductId).toMatch(/^prod_/)
    }
  })

  it('credits increase with price', () => {
    expect(PLANS[0].credits).toBe(400)  // Pro
    expect(PLANS[1].credits).toBe(900)  // Max
    expect(PLANS[2].credits).toBe(1500) // Ultra
    expect(PLANS[0].credits).toBeLessThan(PLANS[1].credits)
    expect(PLANS[1].credits).toBeLessThan(PLANS[2].credits)
  })

  it('Max is the recommended plan', () => {
    const recommended = PLANS.filter(p => p.recommended)
    expect(recommended).toHaveLength(1)
    expect(recommended[0].id).toBe('max')
  })

  it('every plan has at least 3 features', () => {
    for (const plan of PLANS) {
      expect(plan.features.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('membership labels cover all plan IDs', () => {
    const planIds: PlanId[] = ['starter', 'trial', 'pro', 'max', 'ultra']
    for (const id of planIds) {
      expect(MEMBERSHIP_LABELS[id]).toBeDefined()
      expect(MEMBERSHIP_LABELS[id].label).toBeTruthy()
      expect(MEMBERSHIP_LABELS[id].color).toBeTruthy()
    }
  })

  it('membership labels are in English', () => {
    for (const [, val] of Object.entries(MEMBERSHIP_LABELS)) {
      // No Chinese characters
      expect(val.label).not.toMatch(/[一-鿿]/)
    }
  })
})

// ─── Payment Webhook Security ─────────────────────────────────────────────────

describe('verifyWebhookSignature', () => {
  const secret = 'test-webhook-secret-123'

  function sign(body: string): string {
    return crypto.createHmac('sha256', secret).update(body).digest('hex')
  }

  it('accepts valid signature', () => {
    // Temporarily set env for this test
    const orig = process.env.CREEM_WEBHOOK_SECRET
    process.env.CREEM_WEBHOOK_SECRET = secret

    const body = '{"type":"checkout.completed","id":"evt_123"}'
    const sig = sign(body)
    expect(verifyWebhookSignature(body, sig)).toBe(true)

    process.env.CREEM_WEBHOOK_SECRET = orig
  })

  it('rejects tampered body', () => {
    const orig = process.env.CREEM_WEBHOOK_SECRET
    process.env.CREEM_WEBHOOK_SECRET = secret

    const body = '{"type":"checkout.completed","id":"evt_123"}'
    const sig = sign(body)
    expect(verifyWebhookSignature(body + 'tampered', sig)).toBe(false)

    process.env.CREEM_WEBHOOK_SECRET = orig
  })

  it('rejects null signature', () => {
    const orig = process.env.CREEM_WEBHOOK_SECRET
    process.env.CREEM_WEBHOOK_SECRET = secret

    expect(verifyWebhookSignature('body', null)).toBe(false)

    process.env.CREEM_WEBHOOK_SECRET = orig
  })

  it('rejects wrong signature', () => {
    const orig = process.env.CREEM_WEBHOOK_SECRET
    process.env.CREEM_WEBHOOK_SECRET = secret

    expect(verifyWebhookSignature('body', 'deadbeef')).toBe(false)

    process.env.CREEM_WEBHOOK_SECRET = orig
  })
})

describe('parseCustomData', () => {
  it('extracts userId and planId from data.custom_data', () => {
    const event = {
      type: 'checkout.completed',
      data: { custom_data: { user_id: 'usr_abc', plan_id: 'pro' } },
    }
    expect(parseCustomData(event)).toEqual({ userId: 'usr_abc', planId: 'pro' })
  })

  it('extracts from top-level custom_data', () => {
    const event = {
      type: 'order.paid',
      custom_data: { user_id: 'usr_xyz', plan_id: 'ultra' },
    }
    expect(parseCustomData(event)).toEqual({ userId: 'usr_xyz', planId: 'ultra' })
  })

  it('returns null if custom_data is missing', () => {
    expect(parseCustomData({ type: 'checkout.completed' })).toBeNull()
    expect(parseCustomData({ type: 'checkout.completed', data: {} })).toBeNull()
  })

  it('returns null if user_id or plan_id is missing', () => {
    const event = { data: { custom_data: { user_id: 'usr_abc' } } }
    expect(parseCustomData(event)).toBeNull()
  })
})

// ─── SMS Stub (Overseas Mode) ─────────────────────────────────────────────────

describe('SMS stub (overseas)', () => {
  it('isValidPhone always returns false', () => {
    expect(isValidPhone('13800138000')).toBe(false)
    expect(isValidPhone('+8613800138000')).toBe(false)
    expect(isValidPhone('anything')).toBe(false)
  })
})
