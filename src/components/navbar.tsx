'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

// Shared Navbar — extracted from landing page, supports mobile hamburger menu
// variant controls display mode:
//   'landing' = Sign in / Sign up / Pricing (landing page)
//   'app' = Back to studio (pricing page / account page / other inner pages)

interface NavbarProps {
  variant?: 'landing' | 'app'
}

export function Navbar({ variant = 'landing' }: NavbarProps) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-noir-900/70 border-b border-gold-400/10">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-baseline gap-2.5 group">
          <span className="font-display text-xl font-light text-noir-50 tracking-luxe group-hover:text-gold-400 transition-colors">LightCraft</span>
          <span className="font-display text-xs text-noir-400 tracking-wide hidden sm:inline">Turn Images into Videos</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-3">
          {variant === 'landing' ? (
            <>
              <Link href="/pricing" className="font-body text-sm text-noir-300 hover:text-gold-400 transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="font-body text-sm text-noir-300 hover:text-noir-100 transition-colors px-4 py-2">
                Sign in
              </Link>
              <Link href="/studio" className="font-body text-sm bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium px-5 py-2 rounded-lg hover:shadow-lg hover:shadow-gold-400/25 transition-all">
                Try for Free
              </Link>
            </>
          ) : (
            <Link href="/studio" className="font-body text-sm text-noir-300 hover:text-gold-400 transition-colors flex items-center gap-1.5">
              ← Back to Studio
            </Link>
          )}
        </div>

        {/* Mobile hamburger menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="sm:hidden p-2 rounded-lg text-noir-300 hover:text-noir-100 hover:bg-noir-700/50 transition-colors"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile expanded menu */}
      {open && (
        <div className="sm:hidden border-t border-noir-700/50 bg-noir-900/95 backdrop-blur-xl">
          <div className="px-6 py-4 space-y-1">
            {variant === 'landing' ? (
              <>
                <Link href="/pricing" onClick={() => setOpen(false)} className="block py-3 font-body text-sm text-noir-200 hover:text-gold-400 transition-colors">
                  Pricing
                </Link>
                <Link href="/login" onClick={() => setOpen(false)} className="block py-3 font-body text-sm text-noir-200 hover:text-gold-400 transition-colors">
                  Sign in
                </Link>
                <Link href="/studio" onClick={() => setOpen(false)} className="block mt-2 py-3 text-center font-body text-sm bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium rounded-lg">
                  Try for Free
                </Link>
              </>
            ) : (
              <Link href="/studio" onClick={() => setOpen(false)} className="block py-3 font-body text-sm text-noir-200 hover:text-gold-400 transition-colors">
                ← Back to Studio
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
