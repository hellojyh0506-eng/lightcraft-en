'use client'

import { Video, ImageIcon, Paintbrush, Link } from 'lucide-react'

export type ToolId = 'video' | 'edit' | 'generate' | 'link'

const TOOLS: { id: ToolId; icon: typeof Video; label: string; desc: string }[] = [
  { id: 'generate', icon: ImageIcon, label: 'Generate', desc: 'Text to image' },
  { id: 'edit', icon: Paintbrush, label: 'Edit', desc: 'Background · Cutout' },
  { id: 'video', icon: Video, label: 'Video', desc: 'Image to video' },
  { id: 'link', icon: Link, label: 'Link', desc: 'URL to video' },
]

interface Props { active: ToolId; onChange: (id: ToolId) => void }

export function ToolTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-1.5 p-1.5 rounded-2xl bg-noir-800/50 border border-noir-600/20">
      {TOOLS.map(({ id, icon: Icon, label, desc }) => (
        <button key={id} onClick={() => onChange(id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-sm transition-all duration-300 ${
            active === id
              ? 'bg-gradient-to-b from-gold-400/20 to-gold-400/5 text-gold-300 shadow-sm shadow-gold-400/10'
              : 'text-noir-400 hover:text-noir-200 hover:bg-noir-700/30'
          }`}>
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium">{label}</span>
          </div>
          <span className={`text-[10px] ${active === id ? 'text-gold-400/60' : 'text-noir-500'}`}>{desc}</span>
        </button>
      ))}
    </div>
  )
}
