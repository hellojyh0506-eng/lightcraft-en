import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const dlMap = new Map<string, number[]>()
function withinDownloadLimit(userId: string): boolean {
  const now = Date.now()
  const ts = (dlMap.get(userId) || []).filter((t) => now - t < 60_000)
  if (ts.length >= 30) return false
  ts.push(now)
  dlMap.set(userId, ts)
  return true
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 })
  }
  if (!withinDownloadLimit(session.user.id)) {
    return NextResponse.json({ error: 'Too many downloads, please try again later' }, { status: 429 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'Missing parameter' }, { status: 400 })
  }

  const gen = await db.generation.findUnique({
    where: { id },
    select: { userId: true, resultImageUrl: true, status: true, type: true },
  })
  if (!gen || gen.userId !== session.user.id) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }
  if (gen.status !== 'completed' || !gen.resultImageUrl) {
    return NextResponse.json({ error: 'Image generation not yet complete' }, { status: 409 })
  }

  // SSRF protection: restrict upstream domains
  const ALLOWED_DOMAINS = ['dashscope.aliyuncs.com', 'cn-beijing.oss.aliyuncs.com', 'cdn.siliconflow.cn', 's3.siliconflow.cn', 'sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com']
  try {
    const urlHost = new URL(gen.resultImageUrl).hostname
    if (!ALLOWED_DOMAINS.some((d) => urlHost === d || urlHost.endsWith('.' + d))) {
      console.warn('Image download domain not in allowlist:', urlHost)
      return NextResponse.json({ error: 'Image source unavailable' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid image URL' }, { status: 502 })
  }

  const upstream = await fetch(gen.resultImageUrl)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Failed to fetch image source, please try again later' }, { status: 502 })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'image/png',
      'Content-Disposition': `attachment; filename="lumiere_${id}.png"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
