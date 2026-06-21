'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PlanId } from '@/lib/plans'

interface CreditsState {
  credits: number | null
  membership: PlanId
  dailyClaimed: boolean
  error: boolean
  loading: boolean
}

export function useCredits() {
  const [state, setState] = useState<CreditsState>({
    credits: null, membership: 'starter', dailyClaimed: true, error: false, loading: true,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, error: false, loading: true }))
    try {
      const res = await fetch('/api/credits')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setState({
        credits: data.credits, membership: data.membership,
        dailyClaimed: !!data.dailyClaimedToday, error: false, loading: false,
      })
    } catch {
      setState((s) => ({ ...s, error: true, loading: false }))
    }
  }, [])

  // 首次加载 + 切回标签页时自动刷新（覆盖支付后返回等场景）
  useEffect(() => {
    // Schedule initial load outside effect body to avoid synchronous setState
    const id = requestAnimationFrame(() => load())
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { cancelAnimationFrame(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [load])

  const claim = useCallback(async () => {
    setState((s) => ({ ...s, dailyClaimed: true }))
    try {
      const res = await fetch('/api/credits', { method: 'POST' })
      const data = await res.json()
      if (res.ok) setState((s) => ({ ...s, credits: data.credits }))
      else setState((s) => ({ ...s, dailyClaimed: false }))
      return res.ok
    } catch {
      setState((s) => ({ ...s, dailyClaimed: false }))
      return false
    }
  }, [])

  return { ...state, reload: load, claim }
}
