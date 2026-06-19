'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { useDraft } from '@/hooks/use-draft'

const STYLES = ['Realistic', 'Anime', '3D', 'Watercolor'] as const
const RATIOS = ['1:1', '16:9', '9:16'] as const

// Prompt quick templates — specific enough for beginners to get great results
const PROMPT_TEMPLATES = [
  { label: 'Product', prompt: 'A bottle of skincare serum on a white marble surface, scattered green leaves beside it, soft side natural light, clean minimal background, e-commerce hero image style' },
  { label: 'Food', prompt: 'A steaming bowl of beef noodle soup, golden chewy noodles, thick beef chunks, garnished with scallions and cilantro, dark wood table background, warm yellow lighting, top-down angle' },
  { label: 'Pet', prompt: 'An orange tabby cat lounging on a beige sofa, sunlight filtering through curtains, round eyes looking at the camera, detailed fur texture, cozy home atmosphere' },
  { label: 'Poster', prompt: 'Summer sale promotional poster, deep red background with gold text, centered blank space for product, discount info section at bottom, clean and bold e-commerce style' },
]

interface Props {
  onGenerate: (data: { prompt: string; style: string; aspectRatio: string }) => void
  busy: boolean
  showToast: (msg: string, type?: 'error' | 'success') => void
}

export function ImageGenInput({ onGenerate, busy, showToast }: Props) {
  const [draft, setDraft] = useDraft('generate')
  const prompt = draft.prompt
  const setPrompt = (v: string) => setDraft((d) => ({ ...d, prompt: v }))
  const [style, setStyle] = useState<string>('Realistic')
  const [ratio, setRatio] = useState<string>('1:1')
  const [polishing, setPolishing] = useState(false)

  async function handlePolish() {
    if (!prompt.trim()) return; setPolishing(true)
    try {
      const res = await fetch('/api/ai/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: 'generate' }) })
      const data = await res.json()
      if (res.ok) { setPrompt(data.polished); showToast('Polish complete', 'success') }
    } catch { showToast('Polish failed') } finally { setPolishing(false) }
  }

  return (
    <div className="space-y-3">
      {/* Prompt quick templates */}
      <div>
        <p className="text-[10px] text-noir-500 mb-1.5">Quick templates</p>
        <div className="flex gap-1.5">
          {PROMPT_TEMPLATES.map((t) => (
            <button key={t.label} onClick={() => setPrompt(t.prompt)}
              className="flex-1 py-1.5 rounded-lg text-[11px] text-noir-300 border border-noir-700/30 hover:border-gold-400/30 hover:text-gold-300 transition-all">
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt input */}
      <div>
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want, e.g.: a latte on a wooden table, natural window light..."
          className="w-full h-24 bg-noir-700/40 border border-noir-500/30 rounded-lg p-3 text-sm text-noir-50 placeholder:text-noir-400 focus:border-gold-400/50 focus:outline-none resize-none" />
        <div className="flex items-center justify-between mt-1.5">
          <button onClick={handlePolish} disabled={polishing || !prompt.trim()} className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 disabled:opacity-40">
            {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {polishing ? 'Polishing...' : 'Free polish'}
          </button>
          <span className="text-[10px] text-noir-600 tabular-nums">{prompt.length}/1000</span>
        </div>
      </div>

      {/* Style selection */}
      <div>
        <p className="text-[10px] text-noir-500 mb-1.5">Style</p>
        <div className="flex gap-1.5">
          {STYLES.map((s) => (
            <button key={s} onClick={() => setStyle(s)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${style === s ? 'bg-gold-400/15 text-gold-300 border border-gold-400/30' : 'text-noir-300 border border-noir-600/30 hover:border-noir-500/50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect ratio selection */}
      <div>
        <p className="text-[10px] text-noir-500 mb-1.5">Ratio</p>
        <div className="flex gap-1.5">
          {RATIOS.map((r) => (
            <button key={r} onClick={() => setRatio(r)}
              className={`flex-1 py-1.5 rounded-lg text-xs transition-all ${ratio === r ? 'bg-gold-400 text-noir-900 font-medium' : 'text-noir-300 border border-noir-600/30 hover:border-noir-500/50'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Cost hint */}
      <div className="text-xs text-noir-400">{style} · {ratio} · 2 credits</div>

      {/* Generate button */}
      <button onClick={() => { if (!prompt.trim()) return showToast('Please enter an image prompt'); onGenerate({ prompt, style, aspectRatio: ratio }) }}
        disabled={busy || !prompt.trim()}
        className="btn-shine w-full py-3 rounded-xl font-display text-base tracking-[0.15em] bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium hover:shadow-lg hover:shadow-gold-400/25 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        {busy ? <Loader2 className="w-5 h-5 animate-spin inline" /> : 'Generate Image'}
      </button>
    </div>
  )
}
