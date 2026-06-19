'use client'

import { useState } from 'react'
import { Check, X, Crown, Loader2 } from 'lucide-react'
import { PLANS } from '@/lib/plans'
import { FAQSection } from '@/components/faq-section'
import { Footer } from '@/components/footer'
import { Navbar } from '@/components/navbar'

export default function PricingPage() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleChoosePlan(planId: string) {
    setError('')
    setLoadingPlan(planId)
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      if (res.status === 401) {
        // Not logged in — redirect to login first
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
        return
      }
      // Redirect to Creem hosted checkout
      window.location.href = data.checkoutUrl
    } catch {
      setError('Payment service unavailable. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-noir-900">
      <Navbar variant="app" />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <h1 className="font-display text-5xl sm:text-6xl font-light text-noir-50 tracking-wide mb-5 leading-tight">
          Find the <span className="text-gold-400">right plan</span>
        </h1>
        <p className="font-body text-noir-400 text-sm">
          Switch anytime, no lock-in. New users get <span className="text-gold-400">50 free credits</span> after email verification.
        </p>
      </section>

      {error && (
        <div className="max-w-5xl mx-auto px-6 mb-4">
          <div className="bg-terracotta-500/10 border border-terracotta-400/20 text-terracotta-400 text-sm font-body rounded-lg px-4 py-3 text-center">
            {error}
          </div>
        </div>
      )}

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan) => (
            <div key={plan.id}
              className={`relative rounded-2xl p-7 transition-all duration-500 ${
                plan.recommended
                  ? 'bg-gradient-to-b from-gold-400/[0.08] to-noir-800/50 border-2 border-gold-400/40 md:-translate-y-3 shadow-2xl shadow-gold-400/10'
                  : 'bg-noir-800/40 border border-noir-600/40 hover:border-gold-400/20'
              }`}>
              {plan.recommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 shadow-lg">
                    <Crown className="w-3.5 h-3.5" />
                    <span className="font-body text-xs font-semibold">Most Popular</span>
                  </div>
                </div>
              )}

              {/* Name + Price */}
              <h3 className="font-display text-2xl text-noir-50 tracking-wide mb-3">{plan.name}</h3>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-4xl font-light text-noir-50">${plan.price}</span>
                <span className="font-body text-sm text-noir-400">/mo</span>
              </div>

              {/* CTA button */}
              <button
                onClick={() => handleChoosePlan(plan.id)}
                disabled={loadingPlan !== null}
                className={`w-full py-3 rounded-xl font-body font-medium transition-all duration-300 mb-7 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  plan.recommended
                    ? 'bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 hover:shadow-lg hover:shadow-gold-400/30 hover:-translate-y-0.5'
                    : 'bg-noir-700/60 text-noir-100 border border-gold-400/20 hover:border-gold-400/50'
                }`}>
                {loadingPlan === plan.id ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                ) : (
                  `Choose ${plan.name}`
                )}
              </button>

              {/* Feature list */}
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    {feature.included
                      ? <Check className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                      : <X className="w-4 h-4 text-noir-600 mt-0.5 shrink-0" />}
                    <span className={`font-body text-sm ${feature.included ? 'text-noir-200' : 'text-noir-500'}`}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-3 gap-8 pt-10 border-t border-noir-700/50">
          {[
            { title: 'Cancel anytime', desc: 'No contracts, switch or cancel freely' },
            { title: 'Instant credits', desc: 'Credits available immediately after upgrade' },
            { title: 'Email support', desc: 'Reach us anytime at support@dflow.top' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <h4 className="font-display text-base text-noir-100 mb-1.5">{item.title}</h4>
              <p className="font-body text-sm text-noir-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <FAQSection />
      <Footer />
    </div>
  )
}
