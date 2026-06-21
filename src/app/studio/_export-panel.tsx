'use client'

import { useState } from 'react'
import { Loader2, Check, Share2, Lock } from 'lucide-react'
import { PLATFORMS, type PlatformId } from '@/lib/platforms'
import { exportVideoForPlatform, downloadBlob, type ExportProgress } from '@/lib/video-export'
import { loadBrandKit } from '@/lib/brand-kit'
import type { TextOverlay } from '@/lib/text-overlay'
import type { Voiceover } from '@/lib/voiceover'
import type { PlanId } from '@/lib/plans'

const FREE_EXPORT_LIMIT = 1
const FREE_ALLOWED: PlatformId[] = ['etsy']

function canExport(platformId: PlatformId, membership?: PlanId): boolean {
  if (!membership) return true
  if (['pro', 'max', 'ultra'].includes(membership)) return true
  return FREE_ALLOWED.includes(platformId)
}

interface Props {
  videoUrl: string
  videoId?: string
  textOverlay?: TextOverlay | null
  voiceover?: Voiceover | null
  membership?: PlanId
}

export function ExportPanel({ videoUrl, videoId, textOverlay, voiceover, membership }: Props) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<PlatformId | null>(null)
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [done, setDone] = useState<Set<PlatformId>>(new Set())

  const isPaid = membership && ['pro', 'max', 'ultra'].includes(membership)

  async function handleExport(platformId: PlatformId) {
    const platform = PLATFORMS.find((p) => p.id === platformId)
    if (!platform || exporting) return

    if (!canExport(platformId, membership)) return

    setExporting(platformId)
    setProgress({ phase: 'loading', percent: 0 })

    try {
      const src = videoId ? `/api/video/download?id=${videoId}` : videoUrl
      const blob = await exportVideoForPlatform(src, platform, textOverlay || undefined, loadBrandKit(), setProgress, voiceover || undefined)
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `dflow_${platformId}_${videoId || 'video'}.${ext}`)
      setDone((prev) => new Set(prev).add(platformId))
    } catch (err) {
      setProgress({ phase: 'error', percent: 0, error: (err as Error).message })
    } finally {
      setExporting(null)
      setTimeout(() => setProgress(null), 2000)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-noir-600/40 text-xs text-noir-400 hover:text-gold-400 hover:border-gold-400/30 transition-all"
      >
        <Share2 className="w-3 h-3" />
        Export for platforms
      </button>
    )
  }

  return (
    <div className="mt-2 p-3 rounded-xl bg-noir-800/30 border border-noir-700/30 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-noir-500 uppercase tracking-wider">Export for</p>
        <button onClick={() => setOpen(false)} className="text-[10px] text-noir-500 hover:text-noir-300">
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {PLATFORMS.map((p) => {
          const isActive = exporting === p.id
          const isDone = done.has(p.id)
          const locked = !canExport(p.id, membership)

          return (
            <button
              key={p.id}
              onClick={() => !locked && handleExport(p.id)}
              disabled={!!exporting || locked}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs relative ${
                locked
                  ? 'bg-noir-800/20 border border-noir-700/20 text-noir-600 cursor-not-allowed'
                  : isDone
                    ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400'
                    : isActive
                      ? 'bg-gold-400/10 border border-gold-400/30 text-gold-400'
                      : 'bg-noir-700/30 border border-noir-600/20 text-noir-300 hover:border-gold-400/30 hover:text-noir-200 disabled:opacity-40'
              }`}
            >
              {isActive ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : isDone ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : locked ? (
                <Lock className="w-3 h-3 shrink-0 text-noir-600" />
              ) : null}
              <div className="min-w-0">
                <p className="font-medium truncate">{p.label}</p>
                <p className="text-[9px] text-noir-500 truncate">{p.description}</p>
              </div>
            </button>
          )
        })}
      </div>

      {!isPaid && (
        <p className="text-[9px] text-noir-500">
          Free accounts can export {FREE_EXPORT_LIMIT} format. <a href="/pricing" className="text-gold-400 hover:underline">Upgrade</a> for all 7 platforms.
        </p>
      )}

      {progress && progress.phase !== 'done' && progress.phase !== 'error' && (
        <div className="space-y-1">
          <div className="h-1 rounded-full bg-noir-700 overflow-hidden">
            <div
              className="h-full bg-gold-400 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-[9px] text-noir-500">
            {progress.phase === 'loading' ? 'Loading video...' : progress.phase === 'processing' ? 'Processing...' : 'Encoding...'}
          </p>
        </div>
      )}

      {progress?.phase === 'error' && (
        <p className="text-[9px] text-terracotta-400">{progress.error || 'Export failed, please try again'}</p>
      )}
    </div>
  )
}
