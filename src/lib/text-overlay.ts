// 文字叠加配置 — 类型定义 + 预设模板
// 前端 HTML/CSS 实时预览，导出时 Canvas drawText 烧录

export interface TextOverlay {
  text: string
  position: 'top' | 'center' | 'bottom'
  fontSize: number // px (基于 1080p，按实际分辨率等比缩放)
  fontFamily: string
  color: string // hex
  bgColor: string // hex with alpha, e.g. '#00000080'
  animation: 'none' | 'fade-in' | 'slide-up'
}

export interface TextPreset {
  key: string
  label: string
  hint: string
  defaults: Partial<TextOverlay>
}

// 商用免费字体列表（Google Fonts，可直接 @import 使用）
export const FONTS = [
  { id: 'Inter', label: 'Inter', style: 'Clean & modern' },
  { id: 'Montserrat', label: 'Montserrat', style: 'Bold & strong' },
  { id: 'Playfair Display', label: 'Playfair', style: 'Elegant & serif' },
  { id: 'Poppins', label: 'Poppins', style: 'Friendly & round' },
  { id: 'Oswald', label: 'Oswald', style: 'Condensed & impactful' },
] as const

// 文字叠加预设
export const TEXT_PRESETS: TextPreset[] = [
  {
    key: 'product-info',
    label: 'Product Info',
    hint: 'Name + price',
    defaults: { position: 'bottom', fontSize: 36, fontFamily: 'Inter', color: '#FFFFFF', bgColor: '#00000066' },
  },
  {
    key: 'shop-now',
    label: 'Shop Now',
    hint: 'CTA button style',
    defaults: { text: 'Shop Now →', position: 'bottom', fontSize: 32, fontFamily: 'Montserrat', color: '#FFFFFF', bgColor: '#E8530099' },
  },
  {
    key: 'limited-time',
    label: 'Limited Offer',
    hint: 'Urgency text',
    defaults: { text: 'Limited Time Only', position: 'top', fontSize: 28, fontFamily: 'Oswald', color: '#FFD700', bgColor: '#00000080' },
  },
  {
    key: 'free-shipping',
    label: 'Free Shipping',
    hint: 'Shipping badge',
    defaults: { text: 'Free Shipping', position: 'top', fontSize: 26, fontFamily: 'Poppins', color: '#FFFFFF', bgColor: '#22C55E99' },
  },
  {
    key: 'custom',
    label: 'Custom Text',
    hint: 'Write your own',
    defaults: { text: '', position: 'bottom', fontSize: 32, fontFamily: 'Inter', color: '#FFFFFF', bgColor: '#00000066' },
  },
]

export const DEFAULT_OVERLAY: TextOverlay = {
  text: '',
  position: 'bottom',
  fontSize: 32,
  fontFamily: 'Inter',
  color: '#FFFFFF',
  bgColor: '#00000066',
  animation: 'none',
}
