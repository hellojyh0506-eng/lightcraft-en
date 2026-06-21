import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { scrapeProduct } from '@/lib/product-scraper'

// 产品页面爬取限流 — 每用户每分钟 10 次
const rateMap = new Map<string, number[]>()
function withinLimit(userId: string): boolean {
  const now = Date.now()
  const ts = (rateMap.get(userId) || []).filter((t) => now - t < 60_000)
  if (ts.length >= 10) return false
  ts.push(now)
  rateMap.set(userId, ts)
  return true
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  if (!withinLimit(session.user.id)) {
    return NextResponse.json({ error: 'Too many requests, please try again later' }, { status: 429 })
  }

  let url: string
  try {
    const body = await req.json()
    url = body.url?.trim()
    if (!url) throw new Error('Missing URL')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    // SSRF protection: validate URL protocol and block private/internal IPs
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are supported' }, { status: 400 })
    }
    // Block private/internal IP ranges and localhost
    const host = parsedUrl.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      host === '[::1]' ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host.endsWith('.internal') ||
      host.endsWith('.local')
    ) {
      return NextResponse.json({ error: 'Private/internal URLs are not allowed' }, { status: 400 })
    }

    const product = await scrapeProduct(url)
    return NextResponse.json(product)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to extract product data'
    return NextResponse.json({ error: msg }, { status: 422 })
  }
}
