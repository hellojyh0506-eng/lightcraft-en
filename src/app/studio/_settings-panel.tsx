'use client'

import { Crown, Lock } from 'lucide-react'
import { MODES, type ModeId } from '@/lib/modes'
import type { PlanId } from '@/lib/plans'

// Derived from MODES registry, no longer hardcoded (L4 fix)
const MODE_LIST = (Object.values(MODES) as { id: ModeId; displayName: string }[]).map((m) => ({
  id: m.id,
  label: MODES[m.id].displayName,
  hint: m.id === 'standard' ? 'HD smooth' : m.id === 'voice' ? 'With audio' : m.id === 'premium' ? '1080P flagship' : 'Two-image blend',
}))

// Minimum membership tier per mode (lowest tier across all durations)
const MODE_MIN_TIER: Record<ModeId, PlanId> = {
  standard: 'starter',
  voice: 'pro',
  premium: 'pro',
  transition: 'pro',
}

// Membership tier rank (for comparison)
const TIER_RANK: Record<PlanId, number> = { starter: 0, trial: 1, pro: 2, max: 3, ultra: 4 }

function tierCanAccess(userTier: PlanId, requiredTier: PlanId): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier]
}

interface Props {
  mode: string; duration: number
  onModeChange: (m: string) => void; onDurationChange: (d: number) => void
  membership?: PlanId // Optional: shows membership gating when provided
}

export function SettingsPanel({ mode, duration, onModeChange, onDurationChange, membership }: Props) {
  // Get available durations from current mode config (H2 fix: no longer hardcoding [5,10,15])
  const modeConfig = MODES[mode as ModeId]
  const allDurations = modeConfig?.durations ?? []
  const availableDurations = membership
    ? [...new Set(allDurations.filter((d) => d.tierAccess.includes(membership)).map((d) => d.sec))]
    : [...new Set(allDurations.map((d) => d.sec))]

  return (
    <div className="space-y-3 p-3 rounded-xl bg-noir-800/60 border border-noir-600/30 animate-fade-in">
      <span className="text-xs text-noir-400 uppercase tracking-wider">Quality Tier</span>
      <div className="grid grid-cols-2 gap-2">
        {MODE_LIST.map(({ id, label, hint }) => {
          const locked = membership ? !tierCanAccess(membership, MODE_MIN_TIER[id]) : false
          return (
            <button key={id} onClick={() => !locked && onModeChange(id)}
              className={`px-3 py-2 rounded-lg border text-left text-xs transition-all relative ${
                locked ? 'border-noir-700/30 text-noir-600 cursor-not-allowed opacity-60' :
                mode === id ? 'border-gold-400 bg-gold-400/[0.08] text-gold-300' : 'border-noir-600/40 text-noir-300 hover:border-gold-400/30'
              }`}>
              <span className="block font-medium">{label}</span>
              <span className="text-noir-400 text-[10px]">{hint}</span>
              {locked && <Lock className="absolute top-2 right-2 w-3 h-3 text-noir-500" />}
            </button>
          )
        })}
      </div>
      <span className="text-xs text-noir-400 uppercase tracking-wider">Duration</span>
      <div className="flex gap-1.5 p-1 rounded-lg bg-noir-700/40">
        {[5, 10, 15].map((sec) => {
          const available = availableDurations.includes(sec)
          return (
            <button key={sec}
              onClick={() => available && onDurationChange(sec)}
              disabled={!available}
              className={`flex-1 py-1.5 rounded-md text-sm transition-all flex items-center justify-center gap-1 ${
                !available ? 'text-noir-600 cursor-not-allowed opacity-40' :
                duration === sec ? 'bg-gold-400 text-noir-900 font-medium' : 'text-noir-300 hover:bg-noir-600/40'
              }`}>
              {sec}s {sec === 15 && <Crown className="w-3 h-3" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
