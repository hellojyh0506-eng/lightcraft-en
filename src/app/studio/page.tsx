'use client'

import { useState, useCallback, useRef } from 'react'
import { Toolbar } from './_toolbar'
import { ToolTabs, type ToolId } from './_tool-tabs'
import { VideoInput } from './_video-input'
import { ImageEditInput } from './_image-edit-input'
import { ImageGenInput } from './_image-gen-input'
import { ResultPanel } from './_result-panel'
import { HistoryBar } from './_history-bar'
import { useCredits } from '@/hooks/use-credits'
import { useGeneration } from '@/hooks/use-generation'
import { useTaskFeed, type Task } from '@/hooks/use-task-feed'

export default function StudioPage() {
  const [tool, setTool] = useState<ToolId>('generate')
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [syncBusy, setSyncBusy] = useState(false) // Sync request loading for image edit/generate
  // Current preview result
  const [currentResult, setCurrentResult] = useState<{ id?: string; url: string; type: 'image' | 'video'; prompt: string } | null>(null)
  const [beforeImage, setBeforeImage] = useState<string | null>(null) // Original image for edit (used for before/after comparison)

  const creds = useCredits()
  const feed = useTaskFeed()
  const feedRef = useRef(feed)
  feedRef.current = feed

  function showToast(msg: string, type: 'error' | 'success' = 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), type === 'error' ? 8000 : 3000)
  }

  const onComplete = useCallback((id: string, url: string) => {
    const f = feedRef.current
    f.update(id, { status: 'completed', resultUrl: url })
    const task = f.tasks.find((t) => t.id === id)
    setCurrentResult({ id, url, type: task?.type === 'video' ? 'video' : 'image', prompt: task?.prompt || '' })
    showToast('Generation complete!', 'success')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onFail = useCallback((msg?: string) => { showToast(msg || 'Generation failed, credits refunded') }, [])
  const gen = useGeneration(onComplete, onFail, creds.reload)

  // Image edit (synchronous)
  async function handleImageEdit(data: { operation: string; image: string; prompt?: string }) {
    setBeforeImage(data.image) // Save original for before/after
    setCurrentResult(null)     // Clear old result
    setSyncBusy(true)
    try {
      const res = await fetch('/api/image/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await res.json()
      if (!res.ok) { showToast(result.error || 'Image edit failed'); return }
      creds.reload()
      feed.add({ id: result.generationId, type: 'image_edit', status: 'completed', prompt: data.prompt || data.operation, resultUrl: result.imageUrl })
      setCurrentResult({ id: result.generationId, url: result.imageUrl, type: 'image', prompt: data.prompt || data.operation })
      showToast('Image edit complete!', 'success')
    } catch { showToast('Request failed, please try again') } finally { setSyncBusy(false) }
  }

  // Image generation (synchronous)
  async function handleImageGen(data: { prompt: string; style: string; aspectRatio: string }) {
    setBeforeImage(null)
    setSyncBusy(true)
    try {
      const res = await fetch('/api/image/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const result = await res.json()
      if (!res.ok) { showToast(result.error || 'Generation failed'); return }
      creds.reload()
      feed.add({ id: result.generationId, type: 'image_gen', status: 'completed', prompt: data.prompt, resultUrl: result.imageUrl })
      setCurrentResult({ id: result.generationId, url: result.imageUrl, type: 'image', prompt: data.prompt })
      showToast('Image generated!', 'success')
    } catch { showToast('Request failed, please try again') } finally { setSyncBusy(false) }
  }

  // Video generation (async polling)
  function handleVideoGen(data: { images: string[]; prompt: string; mode: string; durationSec: number }) {
    setBeforeImage(data.images[0] || null)
    gen.submit('/api/video/generate', data, '/api/video/status').then((r) => {
      if (r.ok) feed.add({ id: r.generationId, type: 'video', status: 'queued', prompt: data.prompt })
      else showToast(r.error)
    })
  }

  // Click a history item
  function handleHistorySelect(task: Task) {
    if (task.resultUrl) {
      setBeforeImage(null) // Clear old original to avoid before/after with history
      setCurrentResult({ id: task.id, url: task.resultUrl, type: task.type === 'video' ? 'video' : 'image', prompt: task.prompt })
    }
  }

  // Video credits are dynamically calculated inside VideoInput

  return (
    <div className="viewport-lock bg-noir-950">
      {/* Top bar */}
      <Toolbar credits={creds.credits} membership={creds.membership} dailyClaimed={creds.dailyClaimed}
        creditsError={creds.error} onReload={creds.reload}
        onClaim={() => creds.claim().then((ok) => showToast(ok ? 'Check-in successful!' : 'Check-in failed', ok ? 'success' : 'error'))} />

      {/* Tab bar */}
      <div className="px-4 py-2 border-b border-noir-800/60">
        <div className="max-w-5xl mx-auto">
          <ToolTabs active={tool} onChange={(t) => { setTool(t); setCurrentResult(null); setBeforeImage(null) }} />
        </div>
      </div>

      {/* Main content: vertical stack on mobile, side-by-side on desktop */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
        {/* Left: input panel */}
        <div className="w-full md:w-[380px] shrink-0 md:border-r border-b md:border-b-0 border-noir-800/60 md:overflow-y-auto p-4">
          {tool === 'edit' && <ImageEditInput onGenerate={handleImageEdit} busy={syncBusy} showToast={showToast} />}
          {tool === 'generate' && <ImageGenInput onGenerate={handleImageGen} busy={syncBusy} showToast={showToast} />}
          {tool === 'video' && <VideoInput onGenerate={handleVideoGen} busy={gen.busy} showToast={showToast} />}
        </div>

        {/* Right: result preview */}
        <div className="flex-1 min-w-0 min-h-[300px] md:min-h-0 overflow-hidden">
          <ResultPanel result={currentResult} beforeImage={tool === 'edit' ? beforeImage : null} syncBusy={syncBusy} genPhase={gen.phase} genElapsed={gen.elapsed} recentTasks={feed.tasks} onTaskSelect={handleHistorySelect} activeTool={tool} />
        </div>
      </div>

      {/* Bottom: history bar */}
      <HistoryBar tasks={feed.tasks} onSelect={handleHistorySelect} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-2.5 rounded-xl backdrop-blur-md text-sm shadow-2xl animate-fade-in ${
          toast.type === 'error' ? 'bg-terracotta-500/20 border border-terracotta-400/30 text-terracotta-200' : 'bg-sage-500/20 border border-sage-400/30 text-sage-200'
        }`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-xs">✕</button>
        </div>
      )}
    </div>
  )
}
