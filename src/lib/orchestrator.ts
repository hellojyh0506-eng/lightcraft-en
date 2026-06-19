import { getEngine } from './engines'
import { getMode, type ModeId } from './modes'
import { bailianAdapter } from './adapters/bailian'
import { siliconflowAdapter } from './adapters/siliconflow'
import type { ProviderAdapter, PollResult } from './adapters/types'

type AdapterMap = Record<'bailian' | 'siliconflow', ProviderAdapter>
const defaultAdapters: AdapterMap = { bailian: bailianAdapter, siliconflow: siliconflowAdapter }

function chain(modeId: ModeId): string[] {
  const m = getMode(modeId)
  return [m.primary, ...m.fallbacks]
}

// Submit: try primary -> fallbacks in order, return the first successful engine and taskId
export async function submitWithFallback(
  modeId: ModeId,
  durationSec: number,
  prompt: string,
  images: string[],
  adapters: AdapterMap = defaultAdapters
): Promise<{ taskId: string; engineId: string; fallbackIndex: number }> {
  const engines = chain(modeId)
  let lastErr: unknown
  for (let i = 0; i < engines.length; i++) {
    const engine = getEngine(engines[i])
    try {
      const taskId = await adapters[engine.provider].submit({ engine, prompt, images, durationSec })
      return { taskId, engineId: engines[i], fallbackIndex: i }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr ?? new Error('All engines failed to submit')
}

// Poll current engine; if failed and fallbacks remain -> resubmit to next engine (caller updates requestId/engineId based on return value)
export async function pollWithFallback(
  modeId: ModeId,
  durationSec: number,
  prompt: string,
  images: string[],
  currentEngineId: string,
  currentTaskId: string,
  adapters: AdapterMap = defaultAdapters
): Promise<PollResult & { engineId: string; taskId: string }> {
  const engines = chain(modeId)
  const idx = engines.indexOf(currentEngineId)
  const engine = getEngine(currentEngineId)
  const r = await adapters[engine.provider].poll(currentTaskId)

  if (r.status === 'failed' && idx >= 0 && idx < engines.length - 1) {
    // Failover to next engine in sequence, frontend continues polling the same generationId
    try {
      const nextEngineId = engines[idx + 1]
      const nextEngine = getEngine(nextEngineId)
      const nextTaskId = await adapters[nextEngine.provider].submit({ engine: nextEngine, prompt, images, durationSec })
      return { status: 'processing', engineId: nextEngineId, taskId: nextTaskId }
    } catch {
      return { ...r, engineId: currentEngineId, taskId: currentTaskId }
    }
  }
  return { ...r, engineId: currentEngineId, taskId: currentTaskId }
}
