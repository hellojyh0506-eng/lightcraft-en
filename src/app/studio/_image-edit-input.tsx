'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Scissors, Droplets, Sparkles, ImageIcon, CheckCircle, AlertCircle, Download, Wand2, RefreshCw } from 'lucide-react'
import { compressImage, ImageError } from '@/lib/image'
import { useDraft } from '@/hooks/use-draft'

type EditOp = 'background' | 'cutout' | 'watermark' | 'enhance' | 'custom'

const OPS: { id: EditOp; icon: typeof Scissors; label: string; action: string; needsPrompt: boolean; cost: number }[] = [
  { id: 'background', icon: ImageIcon, label: 'Bg Swap', action: 'Swap Background', needsPrompt: true, cost: 3 },
  { id: 'cutout', icon: Scissors, label: 'Remove Bg', action: 'Remove Background', needsPrompt: false, cost: 3 },
  { id: 'watermark', icon: Droplets, label: 'Erase Mark', action: 'Erase Watermark', needsPrompt: false, cost: 3 },
  { id: 'enhance', icon: Sparkles, label: 'Enhance', action: 'Enhance Image', needsPrompt: false, cost: 3 },
  { id: 'custom', icon: Wand2, label: 'Custom', action: 'Apply Edit', needsPrompt: true, cost: 3 },
]

const EXAMPLES = [
  { src: '/studio-examples/before-lipstick.jpg', label: 'Lipstick' },
  { src: '/studio-examples/before-headphones.jpg', label: 'Headphones' },
  { src: '/studio-examples/before-cake.jpg', label: 'Cake' },
  { src: '/studio-examples/before-ring.jpg', label: 'Ring' },
]

type ImageItem = { id: string; dataUrl: string; name: string; status: 'idle' | 'processing' | 'done' | 'error'; resultUrl?: string }

interface Props {
  onGenerate: (data: { operation: EditOp; image: string; prompt?: string }) => void
  busy: boolean
  showToast: (msg: string, type?: 'error' | 'success') => void
}

export function ImageEditInput({ onGenerate, busy, showToast }: Props) {
  const [images, setImages] = useState<ImageItem[]>([])
  const [op, setOp] = useState<EditOp>('background')
  const [draft, setDraft] = useDraft('edit')
  // Set different default prompts based on operation
  const defaultPrompts: Partial<Record<EditOp, string>> = { background: 'Pure white background, product centered, soft studio lighting, clean and sharp, suitable for e-commerce hero image', custom: '' }
  const prompt = draft.prompt || defaultPrompts[op] || ''
  const setPrompt = (v: string) => setDraft((d) => ({ ...d, prompt: v }))

  // When switching operation, auto-switch prompt if still on previous default
  function handleOpChange(newOp: EditOp) {
    const oldDefault = defaultPrompts[op] || ''
    if (!draft.prompt || draft.prompt === oldDefault) {
      setDraft((d) => ({ ...d, prompt: defaultPrompts[newOp] || '' }))
    }
    setOp(newOp)
  }
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [polishing, setPolishing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isBatch = images.length > 1
  const currentOp = OPS.find((o) => o.id === op)!

  async function handleFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      try {
        const { dataUrl, name } = await compressImage(file)
        setImages((prev) => [...prev, { id: crypto.randomUUID(), dataUrl, name, status: 'idle' }])
      } catch (err) {
        showToast(err instanceof ImageError ? err.message : 'Image processing failed')
      }
    }
  }

  async function handleExample(src: string, label: string) {
    try {
      const res = await fetch(src); const blob = await res.blob()
      const reader = new FileReader()
      reader.onload = () => {
        setImages([{ id: crypto.randomUUID(), dataUrl: reader.result as string, name: label, status: 'idle' }])
        showToast(`Loaded "${label}"`, 'success')
      }
      reader.readAsDataURL(blob)
    } catch { showToast('Failed to load') }
  }

  function removeImage(id: string) {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }

  async function handlePolish() {
    if (!prompt.trim()) return; setPolishing(true)
    const ctx = op === 'background' ? 'edit_background' : 'edit_custom'
    try {
      const res = await fetch('/api/ai/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: ctx }) })
      const data = await res.json()
      if (res.ok) { setPrompt(data.polished); showToast('Polish complete', 'success') } else showToast(data.error || 'Polish failed')
    } catch { showToast('Polish failed') } finally { setPolishing(false) }
  }

  // Single image processing
  function handleSingle() {
    if (images.length === 0) return showToast('Please upload an image first')
    if (currentOp.needsPrompt && !prompt.trim()) return showToast(op === 'background' ? 'Please describe the background' : 'Please enter edit instructions')
    const img = images[0]
    onGenerate({ operation: op, image: img.dataUrl, prompt: currentOp.needsPrompt ? prompt : undefined })
  }

  // Batch processing
  async function handleBatch() {
    if (images.length === 0) return showToast('Please upload images first')
    if (currentOp.needsPrompt && !prompt.trim()) return showToast(op === 'background' ? 'Please describe the background' : 'Please enter edit instructions')

    setBatchProcessing(true)
    const editPrompt = currentOp.needsPrompt ? prompt : undefined

    for (const img of images) {
      if (img.status === 'done') continue // Skip completed ones

      setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'processing' } : i))

      try {
        const res = await fetch('/api/image/edit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: op, image: img.dataUrl, prompt: editPrompt }),
        })
        const data = await res.json()
        if (res.ok && data.imageUrl) {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'done', resultUrl: data.imageUrl } : i))
        } else {
          setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'error' } : i))
        }
      } catch {
        setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'error' } : i))
      }
    }

    setBatchProcessing(false)
    // 使用 setImages 回调获取最新状态来计算完成/失败数（避免闭包快照读取过期 images）
    setImages((prev) => {
      const failCount = prev.filter((i) => i.status === 'error').length
      showToast(failCount > 0 ? `Done, ${failCount} failed` : 'Batch processing complete!', failCount > 0 ? 'error' : 'success')
      return prev
    })
  }

  const doneCount = images.filter((i) => i.status === 'done').length
  const totalCost = images.filter((i) => i.status !== 'done').length * currentOp.cost

  return (
    <div className="space-y-3">
      {/* Operation selection */}
      <div className="grid grid-cols-5 gap-1">
        {OPS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => handleOpChange(id)}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg text-[11px] transition-all ${
              op === id ? 'bg-gold-400/15 text-gold-300 border border-gold-400/30' : 'text-noir-400 border border-noir-700/30 hover:border-gold-400/20'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Image area: supports multiple images */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className={`grid ${images.length >= 5 ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
            {images.map((img) => (
              <div key={img.id} className={`group relative rounded-lg overflow-hidden border ${
                img.status === 'done' ? 'border-sage-400/40' : img.status === 'error' ? 'border-terracotta-400/40' : img.status === 'processing' ? 'border-gold-400/40 animate-glow' : 'border-noir-700/40'
              } aspect-[4/3]`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.resultUrl || img.dataUrl} alt="" className={`w-full h-full ${img.resultUrl ? 'object-contain bg-white p-1' : 'object-cover'}`} />

                {/* Status overlay */}
                {img.status === 'processing' && (
                  <div className="absolute inset-0 bg-noir-950/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
                  </div>
                )}
                {img.status === 'done' && (
                  <CheckCircle className="absolute top-1.5 right-1.5 w-4 h-4 text-sage-400" />
                )}
                {img.status === 'error' && (
                  <div className="absolute inset-0 bg-noir-950/40 flex flex-col items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4 text-terracotta-400" />
                    <button onClick={() => setImages((prev) => prev.map((i) => i.id === img.id ? { ...i, status: 'idle' } : i))}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-noir-950/60 text-[10px] text-noir-200 hover:bg-noir-950/80 transition-colors">
                      <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                  </div>
                )}

                {/* Delete button */}
                {img.status === 'idle' && (
                  <button onClick={() => removeImage(img.id)} className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-noir-950/80 text-noir-200 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Add more images button (supports drag to append) */}
            <button onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragEnter={() => setDragOver(true)}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
              className={`aspect-[4/3] rounded-lg border border-dashed flex flex-col items-center justify-center transition-all ${
                dragOver ? 'border-gold-400 bg-gold-400/5 text-gold-400' : 'border-noir-600/40 text-noir-500 hover:border-gold-400/40 hover:text-gold-400/70'
              }`}>
              <Upload className="w-4 h-4 mb-1" />
              <span className="text-[10px]">Add</span>
            </button>
          </div>

          {/* Batch stats */}
          {isBatch && (
            <p className="text-[11px] text-noir-400">
              {images.length} images · {doneCount > 0 && `${doneCount} done · `}
              Est. {totalCost} credits
            </p>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragEnter={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
            className={`w-full border border-dashed rounded-xl p-5 text-center transition-all group ${
              dragOver ? 'border-gold-400 bg-gold-400/5' : 'border-noir-600/40 hover:border-gold-400/50'
            }`}>
            <Upload className={`w-5 h-5 mx-auto mb-1.5 transition-colors ${dragOver ? 'text-gold-400' : 'text-noir-500 group-hover:text-gold-400/70'}`} />
            <p className="text-xs text-noir-400">Drag or click to upload (multi-select supported)</p>
          </button>
          <div className="mt-2">
            <p className="text-[10px] text-noir-500 mb-1.5">No image? Try these</p>
            <div className="flex gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex.label} onClick={() => handleExample(ex.src, ex.label)}
                  className="flex-1 rounded-lg overflow-hidden border border-noir-700/30 hover:border-gold-400/40 transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ex.src} alt={ex.label} className="w-full aspect-square object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleFiles(e.target.files)} />

      {/* Prompt: shown for background or custom operations */}
      {currentOp.needsPrompt && (
        <div>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder={op === 'custom' ? 'Describe the edit you want, e.g.: change hairstyle, remove bystanders, change outfit to red...' : 'Describe the background you want...'}
            className="w-full h-14 bg-noir-800/40 border border-noir-700/30 rounded-lg p-2.5 text-sm text-noir-50 placeholder:text-noir-500 focus:border-gold-400/40 focus:outline-none resize-none" />
          <div className="flex items-center mt-1.5">
            <button onClick={handlePolish} disabled={polishing || !prompt.trim()} className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 disabled:opacity-40">
              {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {polishing ? 'Polishing...' : 'Free polish'}
            </button>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button onClick={isBatch ? handleBatch : handleSingle}
        disabled={busy || batchProcessing || images.length === 0}
        className="btn-shine w-full py-2.5 rounded-xl bg-gold-400 text-noir-950 font-body text-sm font-semibold hover:bg-gold-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {batchProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing {doneCount}/{images.length}</> :
          isBatch ? `Batch ${currentOp.action} (${images.length} images · ${totalCost} credits)` :
          `${currentOp.action} · ${currentOp.cost} credits`}
      </button>

      {/* After batch complete: download all */}
      {doneCount > 0 && doneCount === images.length && (
        <div className="flex gap-2">
          <button onClick={async () => { for (const img of images) { if (img.resultUrl) { const a = document.createElement('a'); a.href = img.resultUrl; a.download = `${img.name}-${op}.jpg`; a.click(); await new Promise((r) => setTimeout(r, 500)) } } }}
            className="flex-1 py-2 rounded-lg border border-gold-400/30 text-gold-400 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-gold-400/10 transition-colors">
            <Download className="w-3.5 h-3.5" /> Download All
          </button>
          <button onClick={() => setImages([])} className="px-4 py-2 rounded-lg text-noir-400 text-xs hover:text-noir-200 transition-colors">
            Clear
          </button>
        </div>
      )}
    </div>
  )
}
