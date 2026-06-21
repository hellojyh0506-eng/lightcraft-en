export interface Voiceover {
  script: string
  voice: VoiceId
  audioUrl: string
  audioDuration: number
}

export type VoiceId = 'alex' | 'benjamin' | 'claire' | 'david'

export const VOICES: { id: VoiceId; label: string; desc: string; gender: 'male' | 'female' }[] = [
  { id: 'alex', label: 'Alex', desc: 'Professional', gender: 'male' },
  { id: 'benjamin', label: 'Benjamin', desc: 'Narrative', gender: 'male' },
  { id: 'claire', label: 'Claire', desc: 'Clear & natural', gender: 'female' },
  { id: 'david', label: 'David', desc: 'Neutral', gender: 'male' },
]

export const TTS_CREDIT_COST = 1
export const TTS_MODEL = 'FunAudioLLM/CosyVoice2-0.5B'
