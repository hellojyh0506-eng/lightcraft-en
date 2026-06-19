'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2, Lock } from 'lucide-react'

export function DeleteAccountButton({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (hasPassword && !password.trim()) {
      setError('Please enter your password to confirm')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hasPassword ? { password } : {}),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Account deletion failed. Please try again later.')
        return
      }
      router.push('/login')
    } catch {
      setError('Account deletion failed. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-terracotta-400/30 text-terracotta-400/70 font-body text-sm hover:border-terracotta-400/60 hover:text-terracotta-400 transition-colors"
      >
        <Trash2 className="w-4 h-4" /> Delete Account
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-noir-950/80 backdrop-blur-sm"
          onClick={() => !loading && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Delete account confirmation"
        >
          <div
            className="bg-noir-800 border border-terracotta-400/20 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="w-10 h-10 text-terracotta-400 mx-auto mb-4" />
            <h3 className="font-display text-xl text-noir-50 mb-2">Delete Your Account</h3>
            <p className="font-body text-sm text-noir-300 mb-6 leading-relaxed">
              Your account data will be permanently deleted, including your creation history and remaining credits. This action cannot be undone.
            </p>
            {hasPassword && (
              <div className="mb-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noir-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password to confirm"
                    className="w-full bg-noir-700/50 border border-noir-500/30 rounded-lg pl-10 pr-4 py-2.5 text-noir-50 text-sm placeholder:text-noir-400 focus:border-terracotta-400/50 focus:outline-none"
                  />
                </div>
              </div>
            )}
            {error && (
              <div role="alert" className="mb-4 px-3 py-2 rounded-lg bg-terracotta-500/10 border border-terracotta-400/20 text-terracotta-400 text-xs font-body">
                {error}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-noir-700/60 text-noir-200 font-body text-sm hover:bg-noir-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-terracotta-500/20 border border-terracotta-400/30 text-terracotta-400 font-body text-sm font-medium hover:bg-terracotta-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
