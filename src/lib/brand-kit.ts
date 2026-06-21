// 品牌套件 — 类型定义 + localStorage 持久化
// 客户端存储，导出时 Canvas 叠加 logo + 品牌名

export interface BrandKit {
  logoDataUrl: string | null // base64 logo 图片
  brandName: string
  primaryColor: string // hex
  secondaryColor: string // hex
  fontFamily: string
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  logoScale: number // 0.05-0.2 占视频宽度比例
  enabled: boolean
}

export const DEFAULT_BRAND_KIT: BrandKit = {
  logoDataUrl: null,
  brandName: '',
  primaryColor: '#FFFFFF',
  secondaryColor: '#000000',
  fontFamily: 'Inter',
  logoPosition: 'bottom-right',
  logoScale: 0.1,
  enabled: false,
}

const STORAGE_KEY = 'dflow_brand_kit'

export function loadBrandKit(): BrandKit {
  if (typeof window === 'undefined') return DEFAULT_BRAND_KIT
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BRAND_KIT
    return { ...DEFAULT_BRAND_KIT, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_BRAND_KIT
  }
}

export function saveBrandKit(kit: BrandKit): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kit))
}

/** 预加载 logo 为 HTMLImageElement（用于 Canvas 绘制） */
export async function loadLogoImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load logo'))
    img.src = dataUrl
  })
}
