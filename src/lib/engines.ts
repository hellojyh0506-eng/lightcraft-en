// Engine registry — single source of truth for all video models. Adding a model = adding one config line.
// Unit cost is only for margin accounting/logging; actual billing is determined by the model billing table.

export interface Engine {
  id: string
  capability: 'i2v' | 'kf2v'
  provider: 'bailian' | 'siliconflow'
  modelCode: string
  resolution: '720P' | '1080P'
  audio: boolean
  costPerSec: number
}

export const ENGINES: Record<string, Engine> = {
  'bailian:i2v:720p:silent': { id: 'bailian:i2v:720p:silent', capability: 'i2v', provider: 'bailian', modelCode: 'wan2.6-i2v-flash', resolution: '720P', audio: false, costPerSec: 0.15 },
  'bailian:i2v:720p:audio': { id: 'bailian:i2v:720p:audio', capability: 'i2v', provider: 'bailian', modelCode: 'wan2.6-i2v-flash', resolution: '720P', audio: true, costPerSec: 0.30 },
  'bailian:i2v:1080p:silent': { id: 'bailian:i2v:1080p:silent', capability: 'i2v', provider: 'bailian', modelCode: 'wan2.6-i2v-flash', resolution: '1080P', audio: false, costPerSec: 0.25 },
  // Transition/disaster recovery: model and request fields pending implementation/real-world testing confirmation (see spec)
  'bailian:kf2v:720p': { id: 'bailian:kf2v:720p', capability: 'kf2v', provider: 'bailian', modelCode: 'wan2.2-kf2v-flash', resolution: '720P', audio: false, costPerSec: 0.20 },
  'siliconflow:i2v:720p': { id: 'siliconflow:i2v:720p', capability: 'i2v', provider: 'siliconflow', modelCode: 'Wan-AI/Wan2.2-I2V-A14B', resolution: '720P', audio: false, costPerSec: 0.40 },
}

export function getEngine(id: string): Engine {
  const e = ENGINES[id]
  if (!e) throw new Error(`Unknown engine: ${id}`)
  return e
}
