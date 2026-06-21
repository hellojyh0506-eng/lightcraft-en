'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Toolbar } from './_toolbar'
import { ToolTabs, type ToolId } from './_tool-tabs'
import { VideoInput } from './_video-input'
import { ImageEditInput } from './_image-edit-input'
import { ImageGenInput } from './_image-gen-input'
import { UrlInput } from './_url-input'
import { BatchVideoInput } from './_batch-video-input'
import { ResultPanel } from './_result-panel'
import { HistoryBar } from './_history-bar'
import { useCredits } from '@/hooks/use-credits'
import { useGeneration } from '@/hooks/use-generation'
import { useTaskFeed, type Task } from '@/hooks/use-task-feed'

export default function StudioPage() {
  const [tool, setTool] = useState<ToolId>('generate')
  const [batchMode, setBatchMode] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null)
  const [syncBusy, setSyncBusy] = useState(false) // Sync request loading for image edit/generate
  // Current preview result
  const [currentResult, setCurrentResult] = useState<{ id?: string; url: string; altUrls?: string[]; type: 'image' | 'video'; prompt: string } | null>(null)
  const [beforeImage, setBeforeImage] = useState<string | null>(null) // Original image for edit (used for before/after comparison)

  const creds = useCredits()
  const feed = useTaskFeed()
  const feedRef = useRef(feed)
  useEffect(() => { feedRef.current = feed })

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

  // Image generation (synchronous) — supports quality toggle and progressive multi-image
  async function handleImageGen(data: { prompt: string; style: string; aspectRatio: string; quality: 'fast' | 'pro' }) {
    setBeforeImage(null)
    setCurrentResult(null)
    setSyncBusy(true)
    try {
      const res = await fetch('/api/image/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || 'Generation failed')
        return
      }

      // Pro mode: standard JSON response
      if (data.quality === 'pro') {
        const result = await res.json()
        creds.reload()
        feed.add({ id: result.generationId, type: 'image_gen', status: 'completed', prompt: data.prompt, resultUrl: result.imageUrl })
        setCurrentResult({ id: result.generationId, url: result.imageUrl, type: 'image', prompt: data.prompt })
        showToast('HD image generated!', 'success')
        return
      }

      // Fast mode: NDJSON stream — show images progressively as they arrive
      const reader = res.body?.getReader()
      if (!reader) { showToast('Stream error'); return }
      const decoder = new TextDecoder()
      let buffer = ''
      const collectedUrls: string[] = []
      let genId = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse complete lines (NDJSON: one JSON object per line)
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete last line in buffer
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line)
            if (chunk.error) { showToast(chunk.error); continue }
            if (chunk.imageUrl) {
              collectedUrls.push(chunk.imageUrl)
              if (!genId) genId = chunk.generationId
              // 渐进更新：每收到一张就立刻展示
              setCurrentResult({
                id: genId,
                url: collectedUrls[0],
                altUrls: [...collectedUrls],
                type: 'image',
                prompt: data.prompt,
              })
              if (collectedUrls.length === 1) {
                // 第一张到达时就加入历史
                feed.add({ id: genId, type: 'image_gen', status: 'completed', prompt: data.prompt, resultUrl: collectedUrls[0] })
              }
            }
          } catch { /* incomplete JSON line, skip */ }
        }
      }

      creds.reload()
      if (collectedUrls.length > 0) {
        if (genId && collectedUrls.length > 1) {
          feed.update(genId, { altUrls: [...collectedUrls] })
        }
        showToast(`${collectedUrls.length} images generated! Pick your favorite`, 'success')
      } else {
        showToast('Generation failed')
      }
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
      setBeforeImage(null)
      setCurrentResult({ id: task.id, url: task.resultUrl, altUrls: task.altUrls, type: task.type === 'video' ? 'video' : 'image', prompt: task.prompt })
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
          {tool === 'video' && (
            <>
              <div className="flex items-center justify-end mb-2">
                <button onClick={() => setBatchMode(!batchMode)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                    batchMode ? 'bg-gold-400/15 text-gold-400 border-gold-400/30' : 'text-noir-500 border-noir-600/30 hover:text-noir-300'
                  }`}>
                  {batchMode ? 'Batch mode' : 'Single mode'}
                </button>
              </div>
              {batchMode ? (
                <BatchVideoInput
                  onBatchComplete={(results, batchPrompt) => {
                    results.forEach((r) => {
                      feed.add({ id: r.id, type: 'video', status: 'completed', prompt: batchPrompt, resultUrl: r.url })
                    })
                    if (results.length > 0) {
                      const last = results[results.length - 1]
                      setCurrentResult({ id: last.id, url: last.url, type: 'video', prompt: batchPrompt })
                    }
                    creds.reload()
                  }}
                  showToast={showToast}
                />
              ) : (
                <VideoInput onGenerate={handleVideoGen} busy={gen.busy} showToast={showToast} />
              )}
            </>
          )}
          {tool === 'link' && <UrlInput onGenerate={handleVideoGen} busy={gen.busy} showToast={showToast} />}
        </div>

        {/* Right: result preview */}
        <div className="flex-1 min-w-0 min-h-[300px] md:min-h-0 overflow-hidden">
          <ResultPanel result={currentResult} beforeImage={tool === 'edit' ? beforeImage : null} syncBusy={syncBusy} genPhase={gen.phase} genElapsed={gen.elapsed} recentTasks={feed.tasks} onTaskSelect={handleHistorySelect} activeTool={tool} membership={creds.membership} showToast={showToast} />
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
