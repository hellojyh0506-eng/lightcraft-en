import type { PlanId } from './plans'

// Mode/tier registry — user-facing "quality tiers" that map to engine + duration + credits + membership gating.
// Adding a tier = adding a config entry; transition credits/models pending real-world calibration (see spec).

const ALL: PlanId[] = ['starter', 'trial', 'pro', 'max', 'ultra']
const PRO_PLUS: PlanId[] = ['pro', 'max', 'ultra']
const ULTRA: PlanId[] = ['ultra']

export type ModeId = 'standard' | 'voice' | 'premium' | 'transition'
export interface ModeDuration {
  sec: number
  creditCost: number
  tierAccess: PlanId[]
}
export interface CreativeMode {
  id: ModeId
  displayName: string
  capability: 'i2v' | 'kf2v'
  primary: string // engine id
  fallbacks: string[] // same capability & tier, ordered
  durations: ModeDuration[]
}

export const MODES: Record<ModeId, CreativeMode> = {
  standard: {
    id: 'standard', displayName: 'Standard', capability: 'i2v',
    primary: 'bailian:i2v:720p:silent', fallbacks: ['siliconflow:i2v:720p'],
    durations: [
      { sec: 5, creditCost: 10, tierAccess: ALL },
      { sec: 10, creditCost: 20, tierAccess: ALL },
    ],
  },
  voice: {
    id: 'voice', displayName: 'Audio', capability: 'i2v',
    primary: 'bailian:i2v:720p:audio', fallbacks: [],
    durations: [
      { sec: 5, creditCost: 15, tierAccess: PRO_PLUS },
      { sec: 10, creditCost: 30, tierAccess: PRO_PLUS },
    ],
  },
  premium: {
    id: 'premium', displayName: 'Premium', capability: 'i2v',
    primary: 'bailian:i2v:1080p:silent', fallbacks: [],
    durations: [
      { sec: 5, creditCost: 14, tierAccess: ULTRA },
      { sec: 10, creditCost: 24, tierAccess: ULTRA },
      { sec: 15, creditCost: 28, tierAccess: ULTRA },
    ],
  },
  transition: {
    id: 'transition', displayName: 'Transition', capability: 'kf2v',
    primary: 'bailian:kf2v:720p', fallbacks: [],
    durations: [
      { sec: 5, creditCost: 12, tierAccess: PRO_PLUS },
      { sec: 10, creditCost: 24, tierAccess: PRO_PLUS },
    ],
  },
}

export function getMode(id: ModeId): CreativeMode {
  const m = MODES[id]
  if (!m) throw new Error(`Unknown mode: ${id}`)
  return m
}

export function getModeDuration(id: ModeId, sec: number): ModeDuration {
  const d = getMode(id).durations.find((x) => x.sec === sec)
  if (!d) throw new Error(`Mode ${id} does not support ${sec}s`)
  return d
}

export function modeAllowed(id: ModeId, sec: number, membership: PlanId): boolean {
  try {
    return getModeDuration(id, sec).tierAccess.includes(membership)
  } catch {
    return false
  }
}
