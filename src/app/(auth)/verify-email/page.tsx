'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Mail, Loader2, CheckCircle, RefreshCw } from 'lucide-react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0) // No default cooldown, can resend immediately on page refresh
  const inputRef = useRef<HTMLInputElement>(null)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-submit when 6 digits filled
  useEffect(() => {
    if (code.length === 6) handleVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  async function handleVerify() {
    if (code.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setCode('')
        inputRef.current?.focus()
        return
      }
      setSuccess(true)
      // Sign out and re-sign in after verification to refresh emailVerified in JWT
      setTimeout(() => {
        signOut({ redirectTo: '/login' })
      }, 2000)
    } catch {
      setError('Network error, please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResending(true)
    try {
      const res = await fetch('/api/auth/email/send', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        return
      }
      setCooldown(60)
    } catch {
      setError('Network error, please try again')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-sage-400 mx-auto mb-4 animate-in fade-in zoom-in duration-500" />
        <h1 className="font-display text-2xl text-noir-50 mb-2">Verification Successful!</h1>
        <p className="font-body text-noir-300 text-sm">Redirecting to sign in, please sign in again to activate...</p>
      </div>
    )
  }

  return (
    <>
      {/* Mobile brand mark */}
      <div className="lg:hidden text-center mb-10">
        <h2 className="font-display text-2xl font-light text-noir-50 tracking-luxe">LightCraft</h2>
        <p className="font-display text-xs text-gold-400 tracking-wide-luxe uppercase mt-1">Turn Images into Videos</p>
      </div>

      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-light text-noir-50 tracking-wide mb-2">Verify Email</h1>
        <p className="font-body text-noir-300 text-sm">
          We&apos;ve sent a <span className="text-gold-400">6-digit verification code</span> to your email
        </p>
      </div>

      {/* Email icon */}
      <div className="mb-6 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
          <Mail className="w-7 h-7 text-gold-400" />
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="mb-6 px-4 py-3 rounded-lg bg-terracotta-500/10 border border-terracotta-400/20 text-terracotta-400 text-sm font-body">
          {error}
        </div>
      )}

      {/* Verification code input */}
      <div className="mb-6">
        <label htmlFor="code" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">
          Verification Code
        </label>
        <input
          ref={inputRef}
          id="code"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="Enter 6-digit code"
          autoComplete="one-time-code"
          className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg px-4 py-3 text-noir-50 text-center text-2xl tracking-[0.5em] placeholder:text-noir-300 placeholder:text-sm placeholder:tracking-normal focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body"
        />
      </div>

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={loading || code.length !== 6}
        className="w-full bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-body font-medium tracking-wider py-3 rounded-lg hover:shadow-lg hover:shadow-gold-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
        ) : (
          'Verify'
        )}
      </button>

      {/* Resend verification code */}
      <div className="mt-6 text-center">
        <p className="font-body text-xs text-noir-400 mb-2">Didn&apos;t receive it? Check your spam folder or</p>
        <button
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="inline-flex items-center gap-1.5 font-body text-sm text-gold-400 hover:text-gold-300 transition-colors disabled:text-noir-500 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
          {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending...' : 'Resend'}
        </button>
      </div>

      {/* Sign out */}
      <div className="mt-8 text-center">
        <button
          onClick={() => signOut({ redirectTo: '/login' })}
          className="font-body text-xs text-noir-500 hover:text-noir-300 transition-colors"
        >
          Sign in with a different account
        </button>
      </div>
    </>
  )
}
