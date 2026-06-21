'use client'

import { useState } from 'react'
import { CATEGORIES, PRESETS, type PresetCategory, type Preset } from '@/lib/presets'

interface Props {
  onSelect: (preset: Preset) => void
}

export function PresetPicker({ onSelect }: Props) {
  const [active, setActive] = useState<PresetCategory>('ecommerce')

  const filtered = PRESETS.filter((p) => p.category === active)

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-noir-500 uppercase tracking-wider">Templates</p>

      {/* 行业分类 tab 条 */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActive(cat.id)}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap ${
              active === cat.id
                ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30'
                : 'text-noir-400 border border-noir-600/30 hover:border-noir-500/50 hover:text-noir-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 模板卡片列表 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {filtered.map((preset) => (
          <button
            key={preset.key}
            onClick={() => onSelect(preset)}
            className="shrink-0 w-[130px] p-2 rounded-lg border border-noir-600/30 hover:border-gold-400/40 bg-noir-700/20 hover:bg-noir-700/40 text-left transition-all group"
          >
            <p className="text-[11px] text-noir-200 font-medium truncate group-hover:text-gold-400 transition-colors">
              {preset.label}
            </p>
            <p className="text-[9px] text-noir-500 mt-0.5 line-clamp-2 leading-tight">
              {preset.hint}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
