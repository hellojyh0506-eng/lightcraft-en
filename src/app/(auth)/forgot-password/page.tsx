'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Mail, Lock, Loader2, CheckCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react'

type PasswordStrength = 'weak' | 'medium' | 'strong'

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length < 8) return 'weak'
  let types = 0
  if (/[a-z]/.test(password)) types++
  if (/[A-Z]/.test(password)) types++
  if (/[0-9]/.test(password)) types++
  if (/[^a-zA-Z0-9]/.test(password)) types++
  if (types >= 3) return 'strong'
  if (types >= 2) return 'medium'
  return 'weak'
}

const strengthConfig = {
  weak: { label: 'Weak', color: 'bg-terracotta-400', width: 'w-1/3' },
  medium: { label: 'Medium', color: 'bg-gold-400', width: 'w-2/3' },
  strong: { label: 'Strong', color: 'bg-sage-400', width: 'w-full' },
} as const

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset' | 'done'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  const strength = newPassword ? getPasswordStrength(newPassword) : null

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleSendCode() {
    if (!email.trim()) return setError('Please enter your email')
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send code')
        return
      }
      setStep('reset')
      setCooldown(60)
      setTimeout(() => codeRef.current?.focus(), 100)
    } catch {
      setError('Network error, please try again')
    } finally {
      setSending(false)
    }
  }

  async function handleReset() {
    if (code.length !== 6) return setError('Please enter the 6-digit code')
    if (newPassword.length < 8) return setError('Password must be at least 8 characters')
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    setError('')
    setResetting(true)
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Reset failed')
        return
      }
      if (data.success) {
        setStep('done')
      } else {
        // Generic response (account may not exist) — show success anyway
        setStep('done')
      }
    } catch {
      setError('Network error, please try again')
    } finally {
      setResetting(false)
    }
  }

  async function handleResend() {
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Failed to resend')
      else setCooldown(60)
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  // Success state
  if (step === 'done') {
    return (
      <>
        <div className="lg:hidden text-center mb-10">
          <h2 className="font-display text-2xl font-light text-noir-50 tracking-luxe">LightCraft</h2>
          <p className="font-display text-xs text-gold-400 tracking-wide-luxe uppercase mt-1">Turn Images into Videos</p>
        </div>
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-sage-400 mx-auto mb-4 animate-in fade-in zoom-in duration-500" />
          <h1 className="font-display text-2xl text-noir-50 mb-2">Password Reset</h1>
          <p className="font-body text-noir-300 text-sm mb-6">Your password has been updated. Please sign in with your new password.</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-body font-medium px-8 py-3 rounded-lg hover:shadow-lg hover:shadow-gold-400/20 transition-all">
            Sign In
          </Link>
        </div>
      </>
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
        <h1 className="font-display text-3xl sm:text-4xl font-light text-noir-50 tracking-wide mb-2">
          {step === 'email' ? 'Reset Password' : 'Enter Code'}
        </h1>
        <p className="font-body text-noir-300 text-sm">
          {step === 'email'
            ? 'Enter your email and we\'ll send you a verification code'
            : <>We&apos;ve sent a <span className="text-gold-400">6-digit code</span> to {email}</>
          }
        </p>
      </div>

      {error && (
        <div role="alert" aria-live="assertive" className="mb-6 px-4 py-3 rounded-lg bg-terracotta-500/10 border border-terracotta-400/20 text-terracotta-400 text-sm font-body">
          {error}
        </div>
      )}

      {step === 'email' ? (
        /* Step 1: Enter email */
        <div className="space-y-5">
          <div>
            <label htmlFor="email" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCode()}
                placeholder="your@email.com"
                required
                autoComplete="email"
                autoFocus
                className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-4 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSendCode}
            disabled={sending || !email.trim()}
            className="w-full bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-body font-medium tracking-wider py-3 rounded-lg hover:shadow-lg hover:shadow-gold-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending...</span></> : 'Send Reset Code'}
          </button>
        </div>
      ) : (
        /* Step 2: Enter code + new password */
        <div className="space-y-5">
          {/* Verification code */}
          <div>
            <label htmlFor="code" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">Verification Code</label>
            <input
              ref={codeRef}
              id="code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              autoComplete="one-time-code"
              className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg px-4 py-3 text-noir-50 text-center text-2xl tracking-[0.5em] placeholder:text-sm placeholder:tracking-normal placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body"
            />
          </div>

          {/* New password */}
          <div>
            <label htmlFor="newPassword" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                maxLength={64}
                autoComplete="new-password"
                className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-11 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-noir-400 hover:text-noir-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {strength && (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-1 bg-noir-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${strengthConfig[strength].color} ${strengthConfig[strength].width}`} />
                </div>
                <span className={`font-body text-xs ${strength === 'weak' ? 'text-terracotta-400' : strength === 'medium' ? 'text-gold-400' : 'text-sage-400'}`}>
                  {strengthConfig[strength].label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label htmlFor="confirmPassword" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                minLength={8}
                maxLength={64}
                autoComplete="new-password"
                className={`w-full bg-noir-700/50 border rounded-lg pl-11 pr-4 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm ${
                  confirmPassword && confirmPassword !== newPassword ? 'border-terracotta-400/50' : 'border-noir-500/30'
                }`}
              />
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="mt-1.5 font-body text-xs text-terracotta-400">Passwords do not match</p>
            )}
          </div>

          <button
            onClick={handleReset}
            disabled={resetting || code.length !== 6 || newPassword.length < 8 || newPassword !== confirmPassword}
            className="w-full bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-body font-medium tracking-wider py-3 rounded-lg hover:shadow-lg hover:shadow-gold-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {resetting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Resetting...</span></> : 'Reset Password'}
          </button>

          {/* Resend code */}
          <div className="text-center">
            <p className="font-body text-xs text-noir-400 mb-2">Didn&apos;t receive it? Check your spam folder or</p>
            <button onClick={handleResend} disabled={cooldown > 0 || sending}
              className="inline-flex items-center gap-1.5 font-body text-sm text-gold-400 hover:text-gold-300 transition-colors disabled:text-noir-500 disabled:cursor-not-allowed">
              {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? 'Sending...' : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {/* Back to login */}
      <p className="text-center font-body text-sm text-noir-300 mt-8">
        <Link href="/login" className="text-gold-400 hover:text-gold-300 transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </p>
    </>
  )
}
