'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, X, CheckCircle, AlertCircle, Download, Sparkles, Layers, StopCircle } from 'lucide-react'
import { compressImage, ImageError } from '@/lib/image'
import { PresetPicker } from './_preset-picker'
import { SettingsPanel } from './_settings-panel'
import { getModeDuration, type ModeId } from '@/lib/modes'
import { useDraft } from '@/hooks/use-draft'

interface BatchImage {
  id: string
  dataUrl: string
  status: 'idle' | 'processing' | 'done' | 'error'
  resultUrl?: string
  generationId?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface Props {
  onBatchComplete: (results: { id: string; url: string }[], prompt: string) => void
  showToast: (msg: string, type?: 'error' | 'success') => void
}

export function BatchVideoInput({ onBatchComplete, showToast }: Props) {
  const [images, setImages] = useState<BatchImage[]>([])
  const [draft, setDraft] = useDraft('batch-video')
  const prompt = draft.prompt
  const setPrompt = (v: string) => setDraft((d) => ({ ...d, prompt: v }))
  const [polishing, setPolishing] = useState(false)
  const [mode, setMode] = useState('standard')
  const [duration, setDuration] = useState(5)
  const [processing, setProcessing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleFiles(files: FileList) {
    const newImages: BatchImage[] = []
    for (const file of Array.from(files).slice(0, 50)) {
      try {
        const { dataUrl } = await compressImage(file)
        newImages.push({ id: crypto.randomUUID(), dataUrl, status: 'idle' })
      } catch (err) {
        showToast(err instanceof ImageError ? err.message : 'Image processing failed')
      }
    }
    setImages((prev) => [...prev, ...newImages].slice(0, 50))
    if (newImages.length > 0) showToast(`${newImages.length} image(s) added`, 'success')
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  // 逐个提交 + 轮询（支持中途取消）
  async function handleBatch() {
    const pending = images.filter((i) => i.status !== 'done')
    if (pending.length === 0) return showToast('No images to process')
    if (!prompt.trim()) return showToast('Please enter a prompt')

    const controller = new AbortController()
    abortRef.current = controller
    setProcessing(true)

    for (const img of pending) {
      if (controller.signal.aborted) break

      setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'processing' } : i))

      try {
        // 1. 提交生成
        const res = await fetch('/api/video/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [img.dataUrl], prompt, mode, durationSec: duration }),
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'error' } : i))
          continue
        }

        const genId = data.generationId
        setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, generationId: genId } : i))

        // 2. 轮询等待完成（最多 6 分钟）
        const start = Date.now()
        let done = false
        while (Date.now() - start < 360_000) {
          if (controller.signal.aborted) break
          await sleep(4000)
          if (controller.signal.aborted) break
          try {
            const statusRes = await fetch('/api/video/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ generationId: genId }),
              signal: controller.signal,
            })
            const statusData = await statusRes.json()

            if (statusData.status === 'completed' && statusData.videoUrl) {
              setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'done', resultUrl: statusData.videoUrl } : i))
              done = true
              break
            }
            if (statusData.status === 'failed') {
              setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'error' } : i))
              done = true
              break
            }
          } catch {
            if (controller.signal.aborted) break
          }
        }

        if (!done && !controller.signal.aborted) {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'error' } : i))
        }
      } catch {
        if (controller.signal.aborted) break
        setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'error' } : i))
      }
    }

    const wasCancelled = controller.signal.aborted
    abortRef.current = null

    // 取消时：将所有 processing 状态的图片重置为 idle
    if (wasCancelled) {
      setImages((prev) => prev.map((i) => i.status === 'processing' ? { ...i, status: 'idle' } : i))
    }

    setProcessing(false)

    // 使用回调获取最新状态来计算完成数
    setImages((prev) => {
      const completed = prev.filter((i) => i.status === 'done' && i.resultUrl)
      const failCount = prev.filter((i) => i.status === 'error').length
      const idleCount = prev.filter((i) => i.status === 'idle').length

      if (wasCancelled) {
        showToast(`Cancelled. ${completed.length} completed, ${idleCount} remaining.`, completed.length > 0 ? 'success' : 'error')
      } else {
        showToast(
          failCount > 0 ? `Done. ${completed.length} completed, ${failCount} failed` : `All ${completed.length} videos completed!`,
          failCount > 0 ? 'error' : 'success'
        )
      }
      if (completed.length > 0) {
        onBatchComplete(completed.map((i) => ({ id: i.generationId!, url: i.resultUrl! })), prompt)
      }
      return prev
    })
  }

  function handleCancel() {
    abortRef.current?.abort()
  }

  async function handlePolish() {
    if (!prompt.trim()) return
    setPolishing(true)
    try {
      const res = await fetch('/api/ai/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: 'video' }) })
      const data = await res.json()
      if (res.ok) { setPrompt(data.polished); showToast('Polish complete', 'success') } else showToast(data.error || 'Polish failed')
    } catch { showToast('Polish failed') } finally { setPolishing(false) }
  }

  const doneCount = images.filter((i) => i.status === 'done').length
  const pendingCount = images.filter((i) => i.status !== 'done').length

  let creditCost = 0
  try { creditCost = getModeDuration(mode as ModeId, duration).creditCost * pendingCount } catch { /* invalid combo */ }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-gold-400/70" />
        <p className="text-[10px] text-noir-500 uppercase tracking-wider">Batch Video Generation</p>
      </div>

      {/* 图片网格 */}
      {images.length > 0 && (
        <div className={`grid ${images.length >= 6 ? 'grid-cols-4' : images.length >= 3 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
          {images.map((img) => (
            <div key={img.id} className={`group relative rounded-lg overflow-hidden border aspect-square ${
              img.status === 'done' ? 'border-emerald-400/40' : img.status === 'error' ? 'border-red-400/40' : img.status === 'processing' ? 'border-gold-400/40' : 'border-noir-700/40'
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.dataUrl} alt="" className="w-full h-full object-cover" />
              {img.status === 'processing' && (
                <div className="absolute inset-0 bg-noir-950/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-gold-400 animate-spin" />
                </div>
              )}
              {img.status === 'done' && <CheckCircle className="absolute top-1 right-1 w-3.5 h-3.5 text-emerald-400" />}
              {img.status === 'error' && <AlertCircle className="absolute top-1 right-1 w-3.5 h-3.5 text-red-400" />}
              {img.status === 'idle' && !processing && (
                <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 w-4 h-4 rounded-full bg-noir-950/70 text-noir-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {!processing && (
        <button onClick={() => fileRef.current?.click()}
          className="w-full border-[1.5px] border-dashed border-noir-500/40 rounded-xl p-4 text-center hover:border-gold-400/60 transition-all group">
          <Upload className="w-5 h-5 mx-auto mb-1 text-noir-400 group-hover:text-gold-400/70 transition-colors" />
          <p className="text-xs text-noir-300">
            {images.length > 0 ? 'Add more images' : 'Upload product images'}
          </p>
          <p className="text-[10px] text-noir-500 mt-0.5">Up to 50 images, same prompt applied to all</p>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />

      {images.length > 0 && (
        <>
          {/* 模板选择 */}
          <PresetPicker onSelect={(preset) => { setPrompt(preset.prompt); showToast(`"${preset.label}" template applied`, 'success') }} />

          {/* Prompt */}
          <div>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the video effect — applied to all images..."
              className="w-full h-16 bg-noir-700/40 border border-noir-500/30 rounded-lg p-3 text-sm text-noir-50 placeholder:text-noir-400 focus:border-gold-400/50 focus:outline-none resize-none" />
            <div className="flex items-center justify-between mt-1">
              <button onClick={handlePolish} disabled={polishing || !prompt.trim()} className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 disabled:opacity-40">
                {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {polishing ? 'Polishing...' : 'Free polish'}
              </button>
            </div>
          </div>

          {/* 视频设置 */}
          <SettingsPanel mode={mode} duration={duration} onModeChange={setMode} onDurationChange={setDuration} />

          {/* 统计 + 生成按钮 */}
          <div className="flex items-center justify-between text-[10px] text-noir-500">
            <span>{images.length} image{images.length > 1 ? 's' : ''} · {doneCount} done</span>
            {creditCost > 0 && <span>~{creditCost} credits total</span>}
          </div>

          {processing ? (
            <div className="flex gap-2">
              <div className="flex-1 py-3 rounded-xl font-display text-sm tracking-[0.1em] bg-noir-700/40 border border-noir-600/30 text-noir-300 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                Processing {doneCount}/{images.length}...
              </div>
              <button onClick={handleCancel}
                className="px-4 py-3 rounded-xl font-display text-sm tracking-[0.1em] bg-red-500/15 border border-red-400/30 text-red-400 hover:bg-red-500/25 transition-all flex items-center gap-1.5">
                <StopCircle className="w-4 h-4" />
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleBatch}
              disabled={pendingCount === 0 || !prompt.trim()}
              className="btn-shine w-full py-3 rounded-xl font-display text-base tracking-[0.15em] bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium hover:shadow-lg hover:shadow-gold-400/25 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2">
              {`Generate ${pendingCount} Video${pendingCount > 1 ? 's' : ''}`}
            </button>
          )}

          {/* 批量下载 */}
          {doneCount > 0 && !processing && (
            <div className="flex gap-2">
              {images.filter(i => i.status === 'done' && i.generationId).map((img, idx) => (
                <a key={img.id} href={`/api/video/download?id=${img.generationId}`} download
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-noir-600/30 text-[10px] text-noir-400 hover:text-gold-400 hover:border-gold-400/30 transition-all">
                  <Download className="w-3 h-3" /> #{idx + 1}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
