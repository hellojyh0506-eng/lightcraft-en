'use client'

import { useState, useRef } from 'react'
import { Mic, Loader2, Play, Pause, RefreshCw, X } from 'lucide-react'
import { VOICES, TTS_CREDIT_COST, type Voiceover, type VoiceId } from '@/lib/voiceover'

interface Props {
  voiceover: Voiceover | null
  onChange: (v: Voiceover | null) => void
  showToast: (msg: string, type?: 'error' | 'success') => void
}

export function VoiceoverEditor({ voiceover, onChange, showToast }: Props) {
  const [open, setOpen] = useState(false)
  const [voice, setVoice] = useState<VoiceId>('alex')
  const [script, setScript] = useState('')
  const [generating, setGenerating] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handleGenerate() {
    if (!script.trim()) return showToast('Please enter a script')
    setGenerating(true)
    try {
      const res = await fetch('/api/audio/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: script.trim(), voice }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Voice generation failed')
        return
      }

      const bytes = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(blob)

      // 解码获取真实时长
      let audioDuration = 0
      try {
        const ctx = new AudioContext()
        const buf = await ctx.decodeAudioData(bytes.buffer.slice(0))
        audioDuration = buf.duration
        await ctx.close()
      } catch { /* 无法获取时长，不影响功能 */ }

      onChange({ script: script.trim(), voice, audioUrl, audioDuration })
      showToast('Voiceover generated!', 'success')
    } catch {
      showToast('Voice generation failed')
    } finally {
      setGenerating(false)
    }
  }

  function handlePlay() {
    if (!voiceover?.audioUrl) return
    // 先清理已有 Audio 实例（防止快速点击创建多个并行播放的 Audio 对象）
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.onended = null
      audioRef.current = null
    }
    if (playing) {
      setPlaying(false)
      return
    }
    const audio = new Audio(voiceover.audioUrl)
    audioRef.current = audio
    audio.onended = () => setPlaying(false)
    audio.play()
    setPlaying(true)
  }

  function handleRemove() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (voiceover?.audioUrl) URL.revokeObjectURL(voiceover.audioUrl)
    onChange(null)
    setPlaying(false)
  }

  if (!open && !voiceover) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-noir-600/40 text-xs text-noir-400 hover:text-gold-400 hover:border-gold-400/30 transition-all"
      >
        <Mic className="w-3 h-3" />
        Add AI voiceover
      </button>
    )
  }

  // 已生成配音
  if (voiceover) {
    const voiceInfo = VOICES.find((v) => v.id === voiceover.voice)
    return (
      <div className="p-2.5 rounded-xl bg-noir-800/30 border border-noir-700/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-3 h-3 text-gold-400/70" />
            <span className="text-[10px] text-noir-500 uppercase tracking-wider">Voiceover</span>
            <span className="text-[10px] text-noir-400">· {voiceInfo?.label}</span>
            {voiceover.audioDuration > 0 && (
              <span className="text-[10px] text-noir-500">{voiceover.audioDuration.toFixed(1)}s</span>
            )}
          </div>
          <button onClick={handleRemove} className="text-[10px] text-noir-500 hover:text-terracotta-400 transition-colors">
            Remove
          </button>
        </div>

        <p className="text-[10px] text-noir-400 line-clamp-2">{voiceover.script}</p>

        <div className="flex gap-2">
          <button
            onClick={handlePlay}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-400/10 border border-gold-400/20 text-xs text-gold-400 hover:bg-gold-400/20 transition-all"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : 'Preview'}
          </button>
          <button
            onClick={() => { handleRemove(); setOpen(true) }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-noir-600/30 text-xs text-noir-400 hover:text-noir-300 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            Redo
          </button>
        </div>
      </div>
    )
  }

  // 编辑态：选声线 + 输入文案 + 生成
  return (
    <div className="p-2.5 rounded-xl bg-noir-800/30 border border-noir-700/30 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-3 h-3 text-gold-400/70" />
          <span className="text-[10px] text-noir-500 uppercase tracking-wider">AI Voiceover</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-[10px] text-noir-500 hover:text-noir-300">
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* 声线选择 */}
      <div className="grid grid-cols-2 gap-1.5">
        {VOICES.map((v) => (
          <button
            key={v.id}
            onClick={() => setVoice(v.id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs ${
              voice === v.id
                ? 'bg-gold-400/10 border border-gold-400/30 text-gold-400'
                : 'bg-noir-700/30 border border-noir-600/20 text-noir-300 hover:border-gold-400/20'
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium">{v.label}</p>
              <p className="text-[9px] text-noir-500">{v.desc} · {v.gender}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 文案输入 */}
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        placeholder="Write your ad script..."
        maxLength={2000}
        className="w-full h-20 bg-noir-700/40 border border-noir-500/30 rounded-lg p-3 text-sm text-noir-50 placeholder:text-noir-400 focus:border-gold-400/50 focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between text-[9px] text-noir-500">
        <span>{script.length}/2000</span>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={generating || !script.trim()}
        className="w-full py-2.5 rounded-lg font-display text-xs tracking-[0.1em] bg-gradient-to-r from-gold-400 to-gold-500 text-noir-900 font-medium hover:shadow-lg hover:shadow-gold-400/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            Generate Voiceover ({TTS_CREDIT_COST} credit)
          </>
        )}
      </button>
    </div>
  )
}
