'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Coins, ChevronDown, LogOut, Settings, CreditCard, Gift, Check, RefreshCw } from 'lucide-react'
import { MEMBERSHIP_LABELS, type PlanId } from '@/lib/plans'

interface Props {
  credits: number | null
  membership: PlanId
  dailyClaimed: boolean
  creditsError: boolean
  onReload: () => void
  onClaim: () => void
}

export function Toolbar({ credits, membership, dailyClaimed, creditsError, onReload, onClaim }: Props) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const memberInfo = MEMBERSHIP_LABELS[membership]
  const showCheckin = ['starter', 'trial'].includes(membership)

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-noir-900/80 border-b border-gold-400/10">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-display text-base sm:text-lg font-light text-noir-50 tracking-luxe shrink-0">LightCraft</Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {showCheckin && credits !== null && (
            dailyClaimed
              ? <span className="hidden sm:flex items-center gap-1 text-noir-400 text-xs"><Check className="w-3 h-3" />Checked in</span>
              : <button onClick={onClaim} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gold-400/15 border border-gold-400/40 text-gold-300 text-xs hover:bg-gold-400/25 transition-all animate-glow"><Gift className="w-3 h-3" /> +3</button>
          )}
          <button onClick={() => creditsError && onReload()} className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-full bg-gold-400/10 border border-gold-400/20 ${creditsError ? 'cursor-pointer' : 'cursor-default'}`}>
            <Coins className="w-3.5 h-3.5 text-gold-400" />
            {credits !== null && <span className="text-sm text-gold-400 font-medium tabular-nums">{credits}</span>}
            {credits === null && !creditsError && <span className="text-sm text-gold-400/50 animate-pulse">··</span>}
            {creditsError && <RefreshCw className="w-3 h-3 text-gold-400" />}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-noir-700/50 transition-colors">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-noir-900 text-[10px] font-semibold">{session?.user?.name?.[0]?.toUpperCase() || 'U'}</div>
              <ChevronDown className="w-3 h-3 text-noir-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-noir-800 border border-noir-600/50 shadow-2xl py-1.5 z-20 animate-fade-in max-w-[calc(100vw-2rem)]">
                  <div className="px-3 py-2 border-b border-noir-700/50">
                    <p className="text-sm text-noir-100 truncate">{session?.user?.name}</p>
                    <p className={`text-xs ${memberInfo.color}`}>{memberInfo.label}</p>
                  </div>
                  <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-noir-200 hover:bg-noir-700/50"><Settings className="w-3.5 h-3.5" />My Settings</Link>
                  <Link href="/pricing" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-noir-200 hover:bg-noir-700/50"><CreditCard className="w-3.5 h-3.5" />Upgrade Plan</Link>
                  <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-noir-300 hover:bg-noir-700/50"><LogOut className="w-3.5 h-3.5" />Sign out</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
