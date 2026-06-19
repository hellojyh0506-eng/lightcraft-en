'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { PhoneAuthForm } from '@/components/phone-auth-form'

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

export default function RegisterPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'phone' | 'email'>('email') // Email preferred (phone SMS pending signature approval)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [website, setWebsite] = useState('') // Honeypot field
  const [consent, setConsent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const strength = password ? getPasswordStrength(password) : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!consent) {
      setError('Please read and agree to the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)
    setSuccess('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: name || undefined, website, consent }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Sign up failed, please try again later')
        return
      }
      // Registration successful — redirect to email verification after sign in
      setSuccess('Sign up successful, redirecting to email verification...')
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        // Auto sign in failed, but account created — tell user to sign in manually
        setSuccess('')
        setError('Account created. Please sign in manually and verify your email')
        setTimeout(() => router.push('/login'), 2000)
      } else {
        router.push('/verify-email')
      }
    } catch {
      setError('Sign up failed, please try again later')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Mobile brand mark */}
      <div className="lg:hidden text-center mb-10">
        <h2 className="font-display text-2xl font-light text-noir-50 tracking-luxe">LightCraft</h2>
        <p className="font-display text-xs text-gold-400 tracking-wide-luxe uppercase mt-1">Turn Images into Videos</p>
      </div>

      {/* Form header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl sm:text-4xl font-light text-noir-50 tracking-wide mb-2">Create Account</h1>
        <p className="font-body text-noir-300 text-sm">
          Get a <span className="text-gold-400">7-day free trial</span>
        </p>
      </div>

      {/* Credits badge */}
      <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20">
        <div className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
        <span className="font-body text-xs text-gold-400">Verify your email to get 50 free credits</span>
      </div>

      {/* Tab switch */}
      <div className="flex p-1 mb-6 rounded-xl bg-noir-800/60 border border-noir-600/40" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'phone'}
          onClick={() => setTab('phone')}
          className={`flex-1 py-2 rounded-lg font-body text-sm transition-all ${tab === 'phone' ? 'bg-gold-400/15 text-gold-400' : 'text-noir-400 hover:text-noir-200'}`}
        >
          Phone
        </button>
        <button
          role="tab"
          aria-selected={tab === 'email'}
          onClick={() => setTab('email')}
          className={`flex-1 py-2 rounded-lg font-body text-sm transition-all ${tab === 'email' ? 'bg-gold-400/15 text-gold-400' : 'text-noir-400 hover:text-noir-200'}`}
        >
          Email
        </button>
      </div>

      {tab === 'phone' ? (
        <PhoneAuthForm consentRequired />
      ) : (
        <>
          {error && (
            <div role="alert" aria-live="assertive" className="mb-6 px-4 py-3 rounded-lg bg-terracotta-500/10 border border-terracotta-400/20 text-terracotta-400 text-sm font-body">
              {error}
            </div>
          )}
          {success && (
            <div role="status" aria-live="polite" className="mb-6 px-4 py-3 rounded-lg bg-sage-500/10 border border-sage-400/20 text-sage-300 text-sm font-body">
              {success}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot field — hidden from real users, prevents password managers/autofill from filling it (avoids false positives) */}
            <input
              type="text"
              name="hp_check"
              id="hp_check"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
              className="hidden"
            />
            {/* Username */}
            <div>
              <label htmlFor="name" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">
                Username <span className="text-noir-400 normal-case">(optional)</span>
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={50}
                  autoComplete="name"
                  className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-4 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                  className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-4 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  maxLength={64}
                  autoComplete="new-password"
                  className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-11 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-noir-400 hover:text-noir-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {strength && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-1 bg-noir-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${strengthConfig[strength].color} ${strengthConfig[strength].width}`} />
                  </div>
                  <span className={`font-body text-xs ${
                    strength === 'weak' ? 'text-terracotta-400' : strength === 'medium' ? 'text-gold-400' : 'text-sage-400'
                  }`}>
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
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  minLength={8}
                  maxLength={64}
                  autoComplete="new-password"
                  className={`w-full bg-noir-700/50 border rounded-lg pl-11 pr-11 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm ${
                    confirmPassword && confirmPassword !== password ? 'border-terracotta-400/50' : 'border-noir-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-noir-400 hover:text-noir-200 transition-colors"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="mt-1.5 font-body text-xs text-terracotta-400">Passwords do not match</p>
              )}
            </div>

            {/* Terms of service consent (compliance) */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-noir-500 bg-noir-700 text-gold-500 focus:ring-gold-400/40"
              />
              <span className="font-body text-xs text-noir-400 leading-relaxed">
                I have read and agree to the{' '}
                <Link href="/terms" className="text-gold-400 hover:text-gold-300">Terms of Service</Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-gold-400 hover:text-gold-300">Privacy Policy</Link>
              </span>
            </label>

            {/* Sign up button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-body font-medium tracking-wider py-3 rounded-lg hover:shadow-lg hover:shadow-gold-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Creating...</span></>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>
        </>
      )}

      {/* Sign in link */}
      <p className="text-center font-body text-sm text-noir-300 mt-8">
        Already have an account?{' '}
        <Link href="/login" className="text-gold-400 hover:text-gold-300 transition-colors">Sign in</Link>
      </p>
    </>
  )
}
