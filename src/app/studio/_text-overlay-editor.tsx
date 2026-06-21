'use client'

import { useState } from 'react'
import { Type, ChevronDown, ChevronUp } from 'lucide-react'
import { TEXT_PRESETS, FONTS, DEFAULT_OVERLAY, type TextOverlay } from '@/lib/text-overlay'

interface Props {
  overlay: TextOverlay | null
  onChange: (overlay: TextOverlay | null) => void
}

export function TextOverlayEditor({ overlay, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)

  // 选择预设
  function applyPreset(presetKey: string) {
    const preset = TEXT_PRESETS.find((p) => p.key === presetKey)
    if (!preset) return
    const newOverlay: TextOverlay = { ...DEFAULT_OVERLAY, ...preset.defaults }
    onChange(newOverlay)
    setExpanded(true)
  }

  // 更新单个字段
  function update(patch: Partial<TextOverlay>) {
    if (!overlay) return
    onChange({ ...overlay, ...patch })
  }

  // 没有叠加时，显示添加按钮 + 预设选择
  if (!overlay) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { onChange({ ...DEFAULT_OVERLAY, text: 'Your text here' }); setExpanded(true) }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-noir-600/40 text-xs text-noir-400 hover:text-gold-400 hover:border-gold-400/30 transition-all"
          >
            <Type className="w-3 h-3" />
            Add text overlay
          </button>
        </div>
        {/* 快速预设 */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {TEXT_PRESETS.filter(p => p.key !== 'custom').map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key)}
              className="shrink-0 px-2 py-1 rounded-md text-[10px] text-noir-500 border border-noir-700/30 hover:border-gold-400/30 hover:text-noir-300 transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-2.5 rounded-xl bg-noir-800/30 border border-noir-700/30 space-y-2">
      {/* 顶部：文字输入 + 删除按钮 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={overlay.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="Enter your text..."
          className="flex-1 bg-noir-700/40 border border-noir-600/30 rounded-lg px-2.5 py-1.5 text-xs text-noir-100 placeholder:text-noir-500 focus:border-gold-400/50 focus:outline-none"
        />
        <button
          onClick={() => { onChange(null); setExpanded(false) }}
          className="px-2 text-[10px] text-noir-500 hover:text-terracotta-400 transition-colors"
        >
          Remove
        </button>
      </div>

      {/* 预设快捷按钮 */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide">
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.key}
            onClick={() => applyPreset(preset.key)}
            className="shrink-0 px-2 py-0.5 rounded text-[10px] text-noir-400 border border-noir-700/30 hover:border-gold-400/30 hover:text-gold-400 transition-all"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* 展开/折叠详细设置 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[10px] text-noir-500 hover:text-noir-300 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? 'Less options' : 'More options'}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-noir-700/20">
          {/* 位置 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-noir-500 w-12 shrink-0">Position</span>
            <div className="flex gap-1">
              {(['top', 'center', 'bottom'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => update({ position: pos })}
                  className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                    overlay.position === pos
                      ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30'
                      : 'text-noir-400 border border-noir-600/30 hover:border-noir-500'
                  }`}
                >
                  {pos.charAt(0).toUpperCase() + pos.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* 字体 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-noir-500 w-12 shrink-0">Font</span>
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => update({ fontFamily: font.id })}
                  className={`shrink-0 px-2 py-0.5 rounded text-[10px] transition-all ${
                    overlay.fontFamily === font.id
                      ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30'
                      : 'text-noir-400 border border-noir-600/30 hover:border-noir-500'
                  }`}
                  style={{ fontFamily: font.id }}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          {/* 字号 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-noir-500 w-12 shrink-0">Size</span>
            <input
              type="range"
              min={16}
              max={64}
              value={overlay.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="flex-1 h-1 accent-gold-400"
            />
            <span className="text-[10px] text-noir-400 w-6 text-right tabular-nums">{overlay.fontSize}</span>
          </div>

          {/* 颜色 */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-noir-500 w-12 shrink-0">Color</span>
            <div className="flex gap-1">
              {['#FFFFFF', '#FFD700', '#FF6B6B', '#4ECDC4', '#000000'].map((c) => (
                <button
                  key={c}
                  onClick={() => update({ color: c })}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    overlay.color === c ? 'border-gold-400 scale-110' : 'border-noir-600 hover:border-noir-400'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
