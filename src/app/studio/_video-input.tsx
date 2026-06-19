'use client'

import { useState, useRef } from 'react'
import { Upload, Sparkles, Loader2, X, Film, ArrowRight } from 'lucide-react'
import { compressImage, ImageError } from '@/lib/image'
import { PRESETS } from '@/lib/presets'
import { getModeDuration, MODES, type ModeId } from '@/lib/modes'
import { SettingsPanel } from './_settings-panel'
import { useDraft } from '@/hooks/use-draft'

const EXAMPLES = [
  { src: '/examples/ecommerce.jpg', label: 'Product', presetKey: 'ecommerce' },
  { src: '/examples/food.jpg', label: 'Food', presetKey: 'food' },
  { src: '/examples/fashion.jpg', label: 'Pet', presetKey: 'pet' },
  { src: '/examples/storefront.jpg', label: 'Storefront', presetKey: 'storefront' },
]

interface Props {
  onGenerate: (data: { images: string[]; prompt: string; mode: string; durationSec: number }) => void
  busy: boolean
  showToast: (msg: string, type?: 'error' | 'success') => void
}

export function VideoInput({ onGenerate, busy, showToast }: Props) {
  const [image, setImage] = useState<string | null>(null)
  const [image2, setImage2] = useState<string | null>(null) // Second image for transition
  const [draft, setDraft] = useDraft('video')
  const prompt = draft.prompt
  const setPrompt = (v: string) => setDraft((d) => ({ ...d, prompt: v }))
  const [polishing, setPolishing] = useState(false)
  const [mode, setMode] = useState('standard')
  const [duration, setDuration] = useState(5)
  const [dragOver, setDragOver] = useState(false)
  const [dragOver2, setDragOver2] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fileRef2 = useRef<HTMLInputElement>(null)

  const isTransition = mode === 'transition'

  async function handleFile(file: File, slot: 1 | 2 = 1) {
    try {
      const { dataUrl } = await compressImage(file)
      if (slot === 2) setImage2(dataUrl)
      else setImage(dataUrl)
    } catch (err) { showToast(err instanceof ImageError ? err.message : 'Image processing failed') }
  }

  async function handleExample(ex: typeof EXAMPLES[number]) {
    try {
      const res = await fetch(ex.src); const blob = await res.blob()
      const reader = new FileReader()
      reader.onload = () => { setImage(reader.result as string); const p = PRESETS.find((x) => x.key === ex.presetKey); if (p) setPrompt(p.prompt); showToast(`Loaded "${ex.label}"`, 'success') }
      reader.readAsDataURL(blob)
    } catch { showToast('Failed to load example') }
  }

  async function handlePolish() {
    if (!prompt.trim()) return; setPolishing(true)
    try {
      const res = await fetch('/api/ai/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: 'video' }) })
      const data = await res.json()
      if (res.ok) { setPrompt(data.polished); showToast('Polish complete', 'success') } else showToast(data.error || 'Polish failed')
    } catch { showToast('Polish failed') } finally { setPolishing(false) }
  }

  function handleSubmit() {
    if (!image) return showToast('Please upload an image first')
    if (isTransition && !image2) return showToast('Transition mode requires two images')
    if (!prompt.trim()) return showToast('Please enter a prompt')
    const images = isTransition ? [image, image2!] : [image]
    onGenerate({ images, prompt, mode, durationSec: duration })
  }

  // Clear second image when switching modes (not needed outside transition) + auto-clamp duration
  function handleModeChange(m: string) {
    setMode(m)
    if (m !== 'transition') setImage2(null)
    // When switching modes: if current duration isn't supported, clamp to max available
    const maxDur = Math.max(...(MODES[m as ModeId]?.durations.map((d) => d.sec) ?? [5]))
    if (duration > maxDur) setDuration(maxDur)
  }

  const hasEnoughImages = isTransition ? !!(image && image2) : !!image

  // Check if current mode+duration combo is valid
  let durationValid = true
  let costLabel = 'Create'
  try {
    const cost = getModeDuration(mode as ModeId, duration).creditCost
    costLabel = `Create · ${cost} credits`
  } catch {
    durationValid = false
    costLabel = 'This tier does not support this duration'
  }

  return (
    <div className="space-y-3">
      {/* Image upload */}
      {isTransition ? (
        // Transition mode: dual image upload
        <div className="flex items-center gap-2">
          {/* Image 1 */}
          <div className="flex-1">
            {image ? (
              <div className="relative rounded-xl overflow-hidden border border-noir-600/40 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Start frame" className="w-full h-full object-cover" />
                <button onClick={() => setImage(null)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-noir-950/70 text-noir-200 flex items-center justify-center hover:bg-noir-950"><X className="w-3 h-3" /></button>
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-noir-950/60 backdrop-blur-sm text-[9px] text-noir-300">Start</span>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragEnter={() => setDragOver(true)}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], 1) }}
                className={`w-full aspect-square border-[1.5px] border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                  dragOver ? 'border-gold-400 bg-gold-400/5' : 'border-noir-500/40 hover:border-gold-400/60'
                }`}>
                <Upload className="w-5 h-5 text-noir-400 mb-1" />
                <span className="text-[10px] text-noir-400">Start</span>
              </button>
            )}
          </div>

          {/* Arrow */}
          <ArrowRight className="w-5 h-5 text-gold-400/40 shrink-0" />

          {/* Image 2 */}
          <div className="flex-1">
            {image2 ? (
              <div className="relative rounded-xl overflow-hidden border border-noir-600/40 aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image2} alt="End frame" className="w-full h-full object-cover" />
                <button onClick={() => setImage2(null)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-noir-950/70 text-noir-200 flex items-center justify-center hover:bg-noir-950"><X className="w-3 h-3" /></button>
                <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-noir-950/60 backdrop-blur-sm text-[9px] text-noir-300">End</span>
              </div>
            ) : (
              <button onClick={() => fileRef2.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver2(true) }}
                onDragEnter={() => setDragOver2(true)}
                onDragLeave={() => setDragOver2(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver2(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], 2) }}
                className={`w-full aspect-square border-[1.5px] border-dashed rounded-xl flex flex-col items-center justify-center transition-all ${
                  dragOver2 ? 'border-gold-400 bg-gold-400/5' : 'border-noir-500/40 hover:border-gold-400/60'
                }`}>
                <Upload className="w-5 h-5 text-noir-400 mb-1" />
                <span className="text-[10px] text-noir-400">End</span>
              </button>
            )}
          </div>
          <input ref={fileRef2} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 2)} />
        </div>
      ) : image ? (
        // Normal mode: image uploaded
        <div className="relative rounded-xl overflow-hidden border border-noir-600/40 aspect-video">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Source" className="w-full h-full object-cover" />
          <button onClick={() => setImage(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-noir-950/70 text-noir-200 flex items-center justify-center hover:bg-noir-950 transition-colors"><X className="w-4 h-4" /></button>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-noir-950/60 backdrop-blur-sm">
            <Film className="w-3 h-3 text-gold-400/70" />
            <span className="text-[10px] text-noir-300">Video source</span>
          </div>
        </div>
      ) : (
        // Normal mode: no upload yet
        <>
          {/* Example scenes */}
          <div>
            <p className="text-[10px] text-noir-500 mb-1.5">Try a scene</p>
            <div className="grid grid-cols-4 gap-1.5">
              {EXAMPLES.map((ex) => (
                <button key={ex.presetKey} onClick={() => handleExample(ex)}
                  className="group relative rounded-lg overflow-hidden border border-noir-700/30 hover:border-gold-400/40 transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ex.src} alt={ex.label} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] text-noir-100 bg-gradient-to-t from-noir-950/70 to-transparent">{ex.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragEnter={() => setDragOver(true)}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            className={`w-full border-[1.5px] border-dashed rounded-xl p-6 text-center transition-all group ${
              dragOver ? 'border-gold-400 bg-gold-400/5' : 'border-noir-500/40 hover:border-gold-400/60'
            }`}>
            <Upload className={`w-6 h-6 mx-auto mb-2 transition-colors ${dragOver ? 'text-gold-400' : 'text-noir-400 group-hover:text-gold-400/70'}`} />
            <p className="text-sm text-noir-300">Drag & drop or click to upload</p>
            <p className="text-[10px] text-noir-500 mt-1">Your image will be turned into a video</p>
          </button>
        </>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], 1)} />

      {/* Prompt */}
      <div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={isTransition ? 'Describe the transition between two images...' : 'Describe the video effect you want...'}
          className="w-full h-20 bg-noir-700/40 border border-noir-500/30 rounded-lg p-3 text-sm text-noir-50 placeholder:text-noir-400 focus:border-gold-400/50 focus:outline-none resize-none" />
        <div className="flex items-center justify-between mt-1.5">
          <button onClick={handlePolish} disabled={polishing || !prompt.trim()} className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 disabled:opacity-40">
            {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {polishing ? 'Polishing...' : 'Free polish'}
          </button>
          <span className="text-[10px] text-noir-600 tabular-nums">{prompt.length}/1000</span>
        </div>
      </div>

      {/* Video settings */}
      <SettingsPanel mode={mode} duration={duration} onModeChange={handleModeChange} onDurationChange={setDuration} />

      {/* Generate button */}
      <button onClick={handleSubmit}
        disabled={busy || !hasEnoughImages || !prompt.trim() || !durationValid}
        className="btn-shine w-full py-3 rounded-xl font-display text-base tracking-[0.15em] bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium hover:shadow-lg hover:shadow-gold-400/25 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : costLabel}
      </button>
    </div>
  )
}
