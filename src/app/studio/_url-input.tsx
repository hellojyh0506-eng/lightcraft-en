'use client'

import { useState } from 'react'
import { Link, Loader2, Sparkles, X, ExternalLink } from 'lucide-react'
import { SettingsPanel } from './_settings-panel'
import { getModeDuration, type ModeId } from '@/lib/modes'
import { useDraft } from '@/hooks/use-draft'

interface ProductData {
  title: string
  description: string
  image: string
  imageDataUrl: string | null
  price: string | null
  platform: string
  url: string
}

interface Props {
  onGenerate: (data: { images: string[]; prompt: string; mode: string; durationSec: number }) => void
  busy: boolean
  showToast: (msg: string, type?: 'error' | 'success') => void
}

export function UrlInput({ onGenerate, busy, showToast }: Props) {
  const [url, setUrl] = useState('')
  const [scraping, setScraping] = useState(false)
  const [product, setProduct] = useState<ProductData | null>(null)
  const [imageData, setImageData] = useState<string | null>(null) // base64 data URL
  const [draft, setDraft] = useDraft('link')
  const prompt = draft.prompt
  const setPrompt = (v: string) => setDraft((d) => ({ ...d, prompt: v }))
  const [polishing, setPolishing] = useState(false)
  const [mode, setMode] = useState('standard')
  const [duration, setDuration] = useState(5)

  // 从 URL 抓取产品数据
  async function handleScrape() {
    const trimmed = url.trim()
    if (!trimmed) return showToast('Please enter a product URL')

    setScraping(true)
    setProduct(null)
    setImageData(null)

    try {
      // 1. 调用爬取 API
      const res = await fetch('/api/scrape/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) { showToast(data.error || 'Failed to extract product data'); return }

      setProduct(data)

      // 2. 使用服务端已下载的 base64 图片（避免客户端 CORS）
      if (data.imageDataUrl) {
        setImageData(data.imageDataUrl)
      } else {
        showToast('Could not load product image. Try downloading it and using the Video tab instead.')
        return
      }

      // 3. 自动生成视频 prompt
      const autoPrompt = buildPrompt(data)
      setPrompt(autoPrompt)

      showToast('Product data extracted', 'success')
    } catch {
      showToast('Failed to connect. Check the URL and try again.')
    } finally {
      setScraping(false)
    }
  }

  // AI 润色
  async function handlePolish() {
    if (!prompt.trim()) return
    setPolishing(true)
    try {
      const res = await fetch('/api/ai/polish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, context: 'video' }) })
      const data = await res.json()
      if (res.ok) { setPrompt(data.polished); showToast('Polish complete', 'success') }
      else showToast(data.error || 'Polish failed')
    } catch { showToast('Polish failed') } finally { setPolishing(false) }
  }

  function handleSubmit() {
    if (!imageData) return showToast('Please extract a product first')
    if (!prompt.trim()) return showToast('Please enter a prompt')
    onGenerate({ images: [imageData], prompt, mode, durationSec: duration })
  }

  function handleClear() {
    setProduct(null)
    setImageData(null)
    setPrompt('')
    setUrl('')
  }

  let costLabel = 'Create Video'
  try {
    const cost = getModeDuration(mode as ModeId, duration).creditCost
    costLabel = `Create Video · ${cost} credits`
  } catch { /* invalid combo */ }

  return (
    <div className="space-y-3">
      {/* URL 输入 */}
      {!product ? (
        <>
          <div>
            <p className="text-[10px] text-noir-500 uppercase tracking-wider mb-2">Paste a product link</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-noir-500" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
                  placeholder="https://www.etsy.com/listing/..."
                  className="w-full bg-noir-700/40 border border-noir-500/30 rounded-lg pl-9 pr-3 py-2.5 text-sm text-noir-50 placeholder:text-noir-500 focus:border-gold-400/50 focus:outline-none"
                />
              </div>
              <button
                onClick={handleScrape}
                disabled={scraping || !url.trim()}
                className="px-4 py-2.5 rounded-lg bg-gold-400/10 border border-gold-400/30 text-gold-400 text-sm font-medium hover:bg-gold-400/20 transition-all disabled:opacity-40"
              >
                {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Extract'}
              </button>
            </div>
          </div>
          <div className="text-[10px] text-noir-600 space-y-0.5">
            <p>Supported: Etsy, Shopify stores, Amazon</p>
            <p>We extract the product image, title, and description to create your video.</p>
          </div>
        </>
      ) : (
        <>
          {/* 产品预览卡片 */}
          <div className="rounded-xl border border-noir-600/30 overflow-hidden bg-noir-800/20">
            {imageData && (
              <div className="aspect-video relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageData} alt={product.title} className="w-full h-full object-cover" />
                <button onClick={handleClear} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-noir-950/70 text-noir-200 flex items-center justify-center hover:bg-noir-950">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="p-3 space-y-1">
              <p className="text-xs font-medium text-noir-200 line-clamp-2">{product.title}</p>
              <div className="flex items-center gap-2">
                {product.price && <span className="text-[11px] text-gold-400 font-medium">{product.price}</span>}
                <span className="text-[10px] text-noir-500 capitalize">{product.platform}</span>
                <a href={product.url} target="_blank" rel="noopener" className="text-noir-500 hover:text-noir-300 ml-auto">
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Prompt */}
          <div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video effect you want..."
              className="w-full h-20 bg-noir-700/40 border border-noir-500/30 rounded-lg p-3 text-sm text-noir-50 placeholder:text-noir-400 focus:border-gold-400/50 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-between mt-1.5">
              <button onClick={handlePolish} disabled={polishing || !prompt.trim()} className="flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 disabled:opacity-40">
                {polishing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                {polishing ? 'Polishing...' : 'Free polish'}
              </button>
              <span className="text-[10px] text-noir-600 tabular-nums">{prompt.length}/1000</span>
            </div>
          </div>

          {/* 视频设置 */}
          <SettingsPanel mode={mode} duration={duration} onModeChange={setMode} onDurationChange={setDuration} />

          {/* 生成按钮 */}
          <button
            onClick={handleSubmit}
            disabled={busy || !imageData || !prompt.trim()}
            className="btn-shine w-full py-3 rounded-xl font-display text-base tracking-[0.15em] bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium hover:shadow-lg hover:shadow-gold-400/25 hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : costLabel}
          </button>
        </>
      )}
    </div>
  )
}

// 根据产品数据自动生成视频 prompt
function buildPrompt(product: ProductData): string {
  const name = product.title.length > 60 ? product.title.slice(0, 60) + '...' : product.title
  return `Product "${name}" displayed on a clean background, evenly lit, camera slowly pushes in and orbits to reveal texture and craftsmanship, premium product showcase, professional advertising quality`
}
