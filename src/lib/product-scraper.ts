// 产品页面数据提取 — 从 Etsy/Shopify/Amazon 链接提取产品信息
// 用 fetch + regex 解析 OG meta tags 和 JSON-LD，不需要 Playwright/Cheerio
// 适合 Vercel serverless（无需浏览器二进制）

export interface ProductData {
  title: string
  description: string
  image: string // 产品主图 URL
  imageDataUrl: string | null // 服务端下载的 base64（避免客户端 CORS）
  price: string | null
  platform: 'etsy' | 'shopify' | 'amazon' | 'other'
  url: string
}

// 支持的平台 URL 模式
const PLATFORM_PATTERNS: { platform: ProductData['platform']; test: RegExp }[] = [
  { platform: 'etsy', test: /etsy\.com\/listing\//i },
  { platform: 'amazon', test: /amazon\.(com|co\.uk|de|fr|it|es|ca|com\.au|co\.jp|in)/i },
  { platform: 'shopify', test: /\/products\//i }, // Shopify 店铺都有 /products/ 路径
]

function detectPlatform(url: string): ProductData['platform'] {
  for (const p of PLATFORM_PATTERNS) {
    if (p.test.test(url)) return p.platform
  }
  return 'other'
}

// 从 HTML 提取 OG meta 标签
function extractMeta(html: string, property: string): string | null {
  // 匹配 <meta property="og:xxx" content="..."> 或 <meta name="xxx" content="...">
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return decodeHtmlEntities(m[1])
  }
  return null
}

// 从 HTML 提取 JSON-LD Product schema
function extractJsonLd(html: string): Record<string, unknown> | null {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      // 可能是数组或单对象
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
          return item as Record<string, unknown>
        }
        // 嵌套 @graph 结构
        if (item['@graph']) {
          const products = (item['@graph'] as Record<string, unknown>[]).filter(
            (g) => g['@type'] === 'Product'
          )
          if (products.length > 0) return products[0]
        }
      }
    } catch {
      // JSON 解析失败，跳过
    }
  }
  return null
}

// HTML 实体解码
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}

// 从 JSON-LD 提取价格
function extractPrice(jsonLd: Record<string, unknown>): string | null {
  const offers = jsonLd.offers as Record<string, unknown> | Record<string, unknown>[] | undefined
  if (!offers) return null
  const offer = Array.isArray(offers) ? offers[0] : offers
  const price = offer?.price as string | number | undefined
  const currency = (offer?.priceCurrency as string) || 'USD'
  if (price != null) return `${currency} ${price}`
  return null
}

/**
 * 从产品页面 URL 提取产品数据
 * 服务端调用（API route 内）
 */
export async function scrapeProduct(url: string): Promise<ProductData> {
  // 验证 URL 格式
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
  } catch {
    throw new Error('Invalid URL format')
  }

  const platform = detectPlatform(url)

  // 清理 URL 跟踪参数（部分平台带大量追踪参数会触发反爬）
  const cleanUrl = cleanTrackingParams(parsed)

  // Etsy 特殊处理：先尝试 OEmbed API（不受 WAF 保护）
  if (platform === 'etsy') {
    try {
      return await scrapeEtsyViaOEmbed(cleanUrl, url)
    } catch {
      // OEmbed 失败，回退到常规抓取
    }
  }

  const res = await fetch(cleanUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
      // Etsy/Amazon 需要 cookie consent 才不会 403
      ...(platform === 'etsy' ? { 'Cookie': 'uaid=uaid_placeholder; fve=1; user_prefs=1' } : {}),
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error(`This ${platform === 'other' ? 'website' : platform.charAt(0).toUpperCase() + platform.slice(1)} page blocked automated access. Please save the product image to your device, then use the Video tab to upload it directly.`)
    }
    throw new Error(`Failed to fetch page (HTTP ${res.status}). Please save the product image and use the Video tab instead.`)
  }

  const html = await res.text()

  // 1. 尝试 JSON-LD 提取（最精确）
  const jsonLd = extractJsonLd(html)

  // 2. OG 标签提取（最通用）
  const ogTitle = extractMeta(html, 'og:title')
  const ogImage = extractMeta(html, 'og:image')
  const ogDesc = extractMeta(html, 'og:description')

  // 3. 回退到 <title> 标签
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const pageTitle = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : null

  // 组装结果（优先级：JSON-LD > OG > fallback）
  const title = (jsonLd?.name as string) || ogTitle || pageTitle || 'Untitled Product'
  const image = ogImage || (jsonLd?.image as string) || ''
  const description = ogDesc || (jsonLd?.description as string) || ''
  const price = jsonLd ? extractPrice(jsonLd) : null

  if (!image) {
    throw new Error('Could not find a product image on this page. Please save the image and use the Video tab instead.')
  }

  // 服务端下载产品图并转 base64（避免客户端 CORS 问题）
  const imageDataUrl = await downloadImageAsDataUrl(image)

  return {
    title: title.slice(0, 200),
    description: description.slice(0, 500),
    image,
    imageDataUrl,
    price,
    platform,
    url,
  }
}

// 清理 URL 中的追踪参数，减少反爬触发
function cleanTrackingParams(parsed: URL): string {
  const trackingKeys = ['ref', 'sr_prefetch', 'pf_from', 'pro', 'sts', 'content_source', 'logging_key', 'ls', 'utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid']
  for (const key of trackingKeys) {
    parsed.searchParams.delete(key)
  }
  return parsed.toString()
}

// Etsy OEmbed API — 不受 WAF 保护，可获取标题和图片
async function scrapeEtsyViaOEmbed(cleanUrl: string, originalUrl: string): Promise<ProductData> {
  const oembedUrl = `https://www.etsy.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`
  const res = await fetch(oembedUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DFlowBot/1.0)' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error('OEmbed failed')
  const data = await res.json()

  const title = data.title || 'Etsy Product'
  // OEmbed 返回的 thumbnail_url 是产品图
  const image = data.thumbnail_url || ''
  if (!image) throw new Error('No image in OEmbed')

  // 下载图片
  const imageDataUrl = await downloadImageAsDataUrl(image)

  return {
    title: title.slice(0, 200),
    description: data.provider_name ? `Listed on ${data.provider_name}` : '',
    image,
    imageDataUrl,
    price: null, // OEmbed 不返回价格
    platform: 'etsy',
    url: originalUrl,
  }
}

// 服务端下载图片并转 base64
async function downloadImageAsDataUrl(imageUrl: string): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DFlowBot/1.0)' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })
    if (imgRes.ok) {
      const buf = await imgRes.arrayBuffer()
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      const base64 = Buffer.from(buf).toString('base64')
      return `data:${contentType};base64,${base64}`
    }
  } catch {
    // 图片下载失败不阻断
  }
  return null
}
