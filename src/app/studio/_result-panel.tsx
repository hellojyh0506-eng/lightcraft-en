'use client'

import { useState, useEffect } from 'react'
import { Loader2, Download, Clock, ArrowRight, Paintbrush, Type, Play, X } from 'lucide-react'
import { BeforeAfterSlider } from '@/components/before-after-slider'
import type { Phase } from '@/hooks/use-generation'
import type { Task } from '@/hooks/use-task-feed'
import type { ToolId } from './_tool-tabs'

interface Props {
  result: { id?: string; url: string; type: 'image' | 'video'; prompt: string } | null
  beforeImage: string | null
  syncBusy: boolean
  genPhase: Phase
  genElapsed: number
  recentTasks: Task[]
  onTaskSelect: (task: Task) => void
  activeTool: ToolId
}

function fmtTime(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}` }

// Empty state guidance config per tab
const EMPTY_STATES: Record<ToolId, { icon: typeof Paintbrush; title: string; desc: string; features: string[] }> = {
  edit: {
    icon: Paintbrush,
    title: 'Upload an image, AI edits it for you',
    desc: 'Upload on the left, see results on the right',
    features: ['Background swap', 'Cutout', 'Remove watermark', 'Enhance', 'Custom edit'],
  },
  generate: {
    icon: Type,
    title: 'Describe it, AI generates it',
    desc: 'Turn text into stunning images',
    features: ['Realistic', 'Anime', '3D Render', 'Watercolor'],
  },
  video: {
    icon: Play,
    title: 'One image, one video',
    desc: 'Upload a still image, AI brings it to life',
    features: ['5-15 sec clips', 'Perfect for social media', 'Multiple camera modes'],
  },
}

export function ResultPanel({ result, beforeImage, syncBusy, genPhase, genElapsed, recentTasks, onTaskSelect, activeTool }: Props) {
  const [lightbox, setLightbox] = useState(false)
  const isGenerating = syncBusy || (genPhase !== 'idle' && genPhase !== 'timeout')
  const completedTasks = recentTasks.filter((t) => t.status === 'completed' && t.resultUrl)

  // ESC to close lightbox
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  // Empty state
  if (!result && !isGenerating && genPhase !== 'timeout') {
    const empty = EMPTY_STATES[activeTool]
    const Icon = empty.icon

    return (
      <div className="h-full flex flex-col p-6 overflow-y-auto">
        {completedTasks.length > 0 ? (
          // Has history: show recent works + brief guidance
          <>
            <p className="font-body text-xs text-noir-500 mb-3">Recent works</p>
            <div className="grid grid-cols-2 gap-2.5">
              {completedTasks.slice(0, 8).map((task) => (
                <button key={task.id} onClick={() => onTaskSelect(task)}
                  className="card-glow group aspect-[4/3] rounded-xl overflow-hidden border border-noir-800/40">
                  {task.type === 'video' ? (
                    <video src={task.resultUrl} className="w-full h-full object-cover" preload="metadata" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={task.resultUrl!} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          // No history: show tab-specific guidance
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {/* Icon area */}
            <div className="relative mb-8">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold-400/10 to-gold-400/[0.02] flex items-center justify-center border border-gold-400/10">
                <Icon className="w-8 h-8 text-gold-400/50" />
              </div>
              {/* Top-right arrow decoration */}
              <div className="absolute -top-1 -right-3 w-6 h-6 rounded-full bg-gold-400/10 flex items-center justify-center">
                <ArrowRight className="w-3 h-3 text-gold-400/40" />
              </div>
            </div>

            {/* Title */}
            <h3 className="font-display text-lg text-noir-200 tracking-wide mb-2">
              {empty.title}
            </h3>
            <p className="font-body text-sm text-noir-500 mb-6">
              {empty.desc}
            </p>

            {/* Feature tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {empty.features.map((f) => (
                <span key={f} className="px-3 py-1 rounded-full bg-noir-800/40 border border-noir-700/30 text-xs text-noir-400">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Timeout state
  if (genPhase === 'timeout') {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-terracotta-400/10 flex items-center justify-center mb-4">
          <Clock className="w-7 h-7 text-terracotta-400" />
        </div>
        <p className="font-display text-base text-noir-200 tracking-wide mb-2">Generation timed out</p>
        <p className="font-body text-sm text-noir-400 mb-1">The server may be busy, please try again later</p>
        <p className="font-body text-xs text-noir-500">Credits will be refunded automatically. If not received, please email support@dflow.top</p>
      </div>
    )
  }

  // Generating
  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 relative">
        {/* Sync operations (edit/generate) with source image: show image + translucent overlay */}
        {syncBusy && beforeImage && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={beforeImage} alt="Original" className="absolute inset-0 w-full h-full object-contain opacity-30" />
            <div className="absolute inset-0 bg-noir-950/60" />
          </>
        )}
        <div className="relative z-10 flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-gold-400 animate-spin mb-5" />
          <p className="font-display text-base text-noir-200 tracking-wide mb-2">
            {syncBusy ? 'Processing...' : genPhase === 'submitting' ? 'Submitting...' : genPhase === 'queued' ? 'In queue...' : genPhase === 'unstable' ? 'Connection unstable...' : 'Generating...'}
          </p>
          {!syncBusy && <p className="font-body text-sm text-gold-400/70 tabular-nums mb-3">{fmtTime(genElapsed)}</p>}
          <p className="font-body text-xs text-noir-500">{syncBusy ? 'Usually a few seconds' : 'Usually 1-3 minutes'}</p>
        </div>
      </div>
    )
  }

  // Has result
  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-1 min-h-0 flex items-center justify-center rounded-xl overflow-hidden bg-noir-900/50 border border-noir-800/40">
        {beforeImage && result ? (
          <BeforeAfterSlider beforeSrc={beforeImage} afterSrc={result.url} className="w-full h-full" />
        ) : result?.type === 'video' ? (
          <video src={result.url} controls autoPlay loop muted playsInline className="max-w-full max-h-full object-contain" />
        ) : result ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.url} alt="" className="max-w-full max-h-full object-contain cursor-zoom-in" onClick={() => setLightbox(true)} />
        ) : null}
      </div>

      {result && (
        <div className="mt-3 flex items-center justify-between">
          <p className="font-body text-xs text-noir-500 truncate max-w-[60%]">{result.prompt}</p>
          {result.id ? (
            <a href={`/api/${result.type === 'video' ? 'video' : 'image'}/download?id=${result.id}`} download className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-400 text-noir-950 text-sm font-medium hover:bg-gold-300 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          ) : (
            <a href={result.url} target="_blank" rel="noopener" className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gold-400 text-noir-950 text-sm font-medium hover:bg-gold-300 transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}
        </div>
      )}

      {/* Lightbox fullscreen */}
      {lightbox && result && result.type === 'image' && (
        <div className="fixed inset-0 z-[90] bg-noir-950/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-noir-800/80 text-noir-200 flex items-center justify-center hover:bg-noir-700 transition-colors" onClick={() => setLightbox(false)}>
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.url} alt="" className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
