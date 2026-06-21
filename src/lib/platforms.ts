// Platform export presets — format specs for major social/e-commerce platforms
// Used by /api/video/export to FFmpeg-process videos for each platform.

export type PlatformId =
  | 'etsy'
  | 'instagram-reels'
  | 'tiktok'
  | 'youtube-shorts'
  | 'facebook'
  | 'amazon'
  | 'pinterest'

export interface PlatformPreset {
  id: PlatformId
  label: string
  aspect: string // FFmpeg aspect ratio string e.g. '1:1', '9:16', '16:9'
  width: number
  height: number
  stripAudio: boolean
  maxDurationSec: number | null // null = no limit
  description: string
}

export const PLATFORMS: PlatformPreset[] = [
  {
    id: 'etsy',
    label: 'Etsy',
    aspect: '1:1',
    width: 1080,
    height: 1080,
    stripAudio: true,
    maxDurationSec: 15,
    description: 'Square · Silent · 5-15s',
  },
  {
    id: 'instagram-reels',
    label: 'Instagram Reels',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    stripAudio: false,
    maxDurationSec: 90,
    description: 'Vertical · Audio',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    stripAudio: false,
    maxDurationSec: 60,
    description: 'Vertical · Audio',
  },
  {
    id: 'youtube-shorts',
    label: 'YouTube Shorts',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    stripAudio: false,
    maxDurationSec: 60,
    description: 'Vertical · Audio',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    aspect: '1:1',
    width: 1080,
    height: 1080,
    stripAudio: false,
    maxDurationSec: null,
    description: 'Square · Audio',
  },
  {
    id: 'amazon',
    label: 'Amazon',
    aspect: '16:9',
    width: 1920,
    height: 1080,
    stripAudio: false,
    maxDurationSec: 60,
    description: 'Landscape · Audio',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    aspect: '2:3',
    width: 1000,
    height: 1500,
    stripAudio: false,
    maxDurationSec: 15,
    description: 'Portrait · Optional audio',
  },
]

export function getPlatform(id: PlatformId): PlatformPreset | undefined {
  return PLATFORMS.find((p) => p.id === id)
}
