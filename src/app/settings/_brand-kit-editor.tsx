'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, X, Palette } from 'lucide-react'
import { loadBrandKit, saveBrandKit, type BrandKit, DEFAULT_BRAND_KIT } from '@/lib/brand-kit'
import { FONTS } from '@/lib/text-overlay'

export function BrandKitEditor() {
  const [kit, setKit] = useState<BrandKit>(DEFAULT_BRAND_KIT)
  const [mounted, setMounted] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = loadBrandKit()
    // 使用 requestAnimationFrame 避免在 effect 中同步 setState 导致级联渲染
    requestAnimationFrame(() => { setKit(saved); setMounted(true) })
  }, [])

  function update(patch: Partial<BrandKit>) {
    const next = { ...kit, ...patch }
    setKit(next)
    saveBrandKit(next)
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return // 2MB limit
    const reader = new FileReader()
    reader.onload = () => update({ logoDataUrl: reader.result as string })
    reader.readAsDataURL(file)
  }

  if (!mounted) return null

  return (
    <div className="bg-noir-800/40 border border-noir-600/40 rounded-2xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-noir-300" />
          <h3 className="text-sm text-noir-200">Brand Kit</h3>
        </div>
        <button
          onClick={() => update({ enabled: !kit.enabled })}
          className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
            kit.enabled ? 'bg-gold-400/15 text-gold-400 border-gold-400/30' : 'text-noir-500 border-noir-600/30'
          }`}
        >
          {kit.enabled ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <p className="text-[10px] text-noir-500">Your logo and brand name are applied automatically when exporting videos.</p>

      {/* Logo 上传 */}
      <div className="flex items-center gap-3">
        {kit.logoDataUrl ? (
          <div className="relative w-16 h-16 rounded-lg border border-noir-600/40 overflow-hidden bg-noir-700/30 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={kit.logoDataUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
            <button onClick={() => update({ logoDataUrl: null })} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-noir-950/80 text-noir-300 flex items-center justify-center">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="w-16 h-16 rounded-lg border border-dashed border-noir-500/40 flex flex-col items-center justify-center hover:border-gold-400/40 transition-all">
            <Upload className="w-4 h-4 text-noir-500" />
            <span className="text-[8px] text-noir-500 mt-0.5">Logo</span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="hidden" onChange={handleLogo} />
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={kit.brandName}
            onChange={(e) => update({ brandName: e.target.value })}
            placeholder="Brand name"
            className="w-full bg-noir-700/40 border border-noir-600/30 rounded-lg px-3 py-1.5 text-xs text-noir-100 placeholder:text-noir-500 focus:border-gold-400/50 focus:outline-none"
          />
          {/* Logo 位置 */}
          <div className="flex gap-1">
            {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
              <button key={pos} onClick={() => update({ logoPosition: pos })}
                className={`flex-1 py-0.5 rounded text-[9px] transition-all ${
                  kit.logoPosition === pos ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30' : 'text-noir-500 border border-noir-700/30'
                }`}>
                {pos.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 颜色 + 字体 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-noir-500 mb-1 block">Primary color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={kit.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer" />
            <span className="text-[10px] text-noir-400 font-mono">{kit.primaryColor}</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-noir-500 mb-1 block">Font</label>
          <select value={kit.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}
            className="w-full bg-noir-700/40 border border-noir-600/30 rounded-lg px-2 py-1 text-xs text-noir-200 focus:outline-none">
            {FONTS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Logo 大小 */}
      <div>
        <label className="text-[10px] text-noir-500 mb-1 block">Logo size</label>
        <input type="range" min={0.05} max={0.2} step={0.01} value={kit.logoScale}
          onChange={(e) => update({ logoScale: Number(e.target.value) })}
          className="w-full h-1 accent-gold-400" />
      </div>
    </div>
  )
}
