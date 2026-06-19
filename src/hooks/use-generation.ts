'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export type Phase = 'idle' | 'submitting' | 'queued' | 'generating' | 'unstable' | 'timeout'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Generic generation task hook: submit + poll + timer */
export function useGeneration(
  onComplete: (id: string, url: string) => void,
  onFail: (msg?: string) => void,
  onCreditsChanged: () => void,
) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const pollingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)
  const unmountedRef = useRef(false)

  const startTimer = useCallback(() => {
    startRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  // Poll status (statusPath varies by task type)
  const poll = useCallback(async (genId: string, statusPath: string) => {
    if (pollingRef.current) return
    pollingRef.current = true
    const maxWait = 360_000
    const start = Date.now()
    let errors = 0

    while (Date.now() - start < maxWait) {
      await sleep(3000)
      try {
        const res = await fetch(statusPath, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generationId: genId }),
        })
        const data = await res.json()
        errors = 0
        if (data.status === 'completed' && (data.videoUrl || data.imageUrl)) {
          stopTimer(); pollingRef.current = false
          setPhase('idle'); setElapsed(0); setGenerationId(null)
          onComplete(genId, data.videoUrl || data.imageUrl); return
        }
        if (data.status === 'failed') {
          stopTimer(); pollingRef.current = false
          setPhase('idle'); setElapsed(0); setGenerationId(null)
          onCreditsChanged(); onFail(data.error); return
        }
        setPhase(data.status === 'pending' ? 'queued' : 'generating')
      } catch {
        errors++
        if (errors >= 2) setPhase('unstable')
      }
    }
    stopTimer(); pollingRef.current = false
    setPhase('timeout')
    // Trigger one server-side poll — activates server timeout detection for refund
    fetch(statusPath, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generationId: genId }),
    }).then((r) => r.json()).then((data) => {
      if (data.status === 'completed' && (data.videoUrl || data.imageUrl)) {
        // Actually completed — timeout was just the client giving up
        setPhase('idle'); setElapsed(0); setGenerationId(null)
        onComplete(genId, data.videoUrl || data.imageUrl)
      } else {
        onCreditsChanged() // Refresh credit balance (server may have refunded)
      }
    }).catch(() => { onCreditsChanged() })
  }, [onComplete, onFail, onCreditsChanged, stopTimer])

  /** Submit generation task. apiPath = submit endpoint, statusPath = poll endpoint */
  const submit = useCallback(async (apiPath: string, body: Record<string, unknown>, statusPath = '/api/video/status') => {
    setPhase('submitting'); setElapsed(0); setGenerationId(null)
    startTimer()
    try {
      const res = await fetch(apiPath, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        stopTimer(); setPhase('idle')
        return { ok: false as const, error: data.error || 'Submission failed', code: data.code }
      }
      onCreditsChanged()
      const genId = data.generationId
      setGenerationId(genId); setPhase('queued')
      poll(genId, statusPath)
      return { ok: true as const, generationId: genId }
    } catch {
      stopTimer(); setPhase('idle')
      return { ok: false as const, error: 'Network error. Please retry.' }
    }
  }, [poll, startTimer, stopTimer, onCreditsChanged])

  const busy = phase !== 'idle' && phase !== 'timeout'

  // Clean up timers and flags on unmount (prevent memory leaks)
  useEffect(() => {
    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearInterval(timerRef.current)
      pollingRef.current = false
    }
  }, [])

  return { phase, elapsed, generationId, busy, submit }
}
