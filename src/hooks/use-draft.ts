'use client'

import { useState, useEffect, useRef } from 'react'

const DRAFT_KEY = 'lc:draft'

interface Draft {
  prompt: string
  [key: string]: unknown
}

export function useDraft(toolId: string) {
  const key = `${DRAFT_KEY}:${toolId}`
  const hydrated = useRef(false)
  const [draft, setDraft] = useState<Draft>({ prompt: '' })

  // 恢复
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) requestAnimationFrame(() => setDraft(JSON.parse(raw)))
    } catch { localStorage.removeItem(key) }
    hydrated.current = true
  }, [key])

  // 持久化
  useEffect(() => {
    if (!hydrated.current) return
    try { localStorage.setItem(key, JSON.stringify(draft)) } catch {}
  }, [draft, key])

  return [draft, setDraft] as const
}
