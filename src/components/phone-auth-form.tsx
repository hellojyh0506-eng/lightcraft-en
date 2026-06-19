'use client'

import { useState, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Smartphone, ShieldCheck, Loader2 } from 'lucide-react'

// 手机号 + 验证码登录表单（首次登录即注册）。登录/注册页共用。
// consentRequired=true 时显示并强制勾选服务条款（注册场景，PIPL 合规）
export function PhoneAuthForm({ consentRequired = false }: { consentRequired?: boolean }) {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [website, setWebsite] = useState('') // 蜜罐
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 卸载时清理倒计时
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const phoneValid = /^1[3-9]\d{9}$/.test(phone)

  async function sendCode() {
    if (!phoneValid) {
      setError('请输入正确的手机号')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/auth/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, website }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '发送失败')
        return
      }
      setCountdown(60)
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } catch {
      setError('发送失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!phoneValid) {
      setError('请输入正确的手机号')
      return
    }
    if (!/^\d{6}$/.test(code)) {
      setError('请输入 6 位验证码')
      return
    }
    if (consentRequired && !consent) {
      setError('请先阅读并同意《服务条款》与《隐私政策》')
      return
    }
    setLoading(true)
    try {
      const result = await signIn('phone', { phone, code, consent: consent ? 'true' : 'false', redirect: false })
      if (result?.error) setError('验证码错误或已过期')
      else router.push('/studio')
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 蜜罐字段 —— 对真人隐藏 */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] w-px h-px opacity-0"
      />

      {error && (
        <div role="alert" aria-live="assertive" className="px-4 py-3 rounded-lg bg-terracotta-500/10 border border-terracotta-400/20 text-terracotta-400 text-sm font-body">
          {error}
        </div>
      )}

      {/* 手机号 */}
      <div>
        <label htmlFor="phone" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">手机号</label>
        <div className="relative">
          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="请输入手机号"
            required
            autoComplete="tel"
            className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-4 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
          />
        </div>
      </div>

      {/* 验证码 + 获取按钮 */}
      <div>
        <label htmlFor="code" className="block font-body text-xs text-noir-300 uppercase tracking-wider mb-2">验证码</label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="6 位验证码"
              required
              autoComplete="one-time-code"
              className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-11 pr-4 py-3 text-noir-50 placeholder:text-noir-300 focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 focus:outline-none transition-all duration-300 font-body text-sm"
            />
          </div>
          <button
            type="button"
            onClick={sendCode}
            disabled={!phoneValid || sending || countdown > 0}
            className="shrink-0 px-4 rounded-lg border border-gold-400/30 text-gold-400 font-body text-sm hover:bg-gold-400/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : '获取验证码'}
          </button>
        </div>
      </div>

      {/* 服务条款同意（注册场景） */}
      {consentRequired && (
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-noir-500 bg-noir-700 text-gold-500 focus:ring-gold-400/40"
          />
          <span className="font-body text-xs text-noir-400 leading-relaxed">
            我已阅读并同意{' '}
            <Link href="/terms" className="text-gold-400 hover:text-gold-300">《服务条款》</Link>
            {' '}与{' '}
            <Link href="/privacy" className="text-gold-400 hover:text-gold-300">《隐私政策》</Link>
          </span>
        </label>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-body font-medium tracking-wider py-3 rounded-lg hover:shadow-lg hover:shadow-gold-400/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
      >
        {loading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /><span>处理中...</span></>
        ) : (
          '登录 / 注册'
        )}
      </button>

      <p className="font-body text-[11px] text-noir-400 text-center leading-relaxed">
        未注册的手机号将自动创建账户并赠送 50 积分试用
      </p>
    </form>
  )
}
