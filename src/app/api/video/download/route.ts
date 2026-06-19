import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// In-process download rate limiting (sufficient for single-process deployment) — max 30 per user per minute, prevent bandwidth abuse/redundant re-fetching
const dlMap = new Map<string, number[]>()
function withinDownloadLimit(userId: string): boolean {
  const now = Date.now()
  const ts = (dlMap.get(userId) || []).filter((t) => now - t < 60_000)
  if (ts.length >= 30) return false
  ts.push(now)
  dlMap.set(userId, ts)
  return true
}

// Video download proxy — server-side fetch of upstream video with streaming response, fundamentally bypasses CORS
// Verifies record belongs to current user before forwarding, preventing unauthorized download of others' videos
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
    select: { userId: true, videoUrl: true, status: true, moderationStatus: true },
  })
  if (!gen || gen.userId !== session.user.id) {
    return NextResponse.json({ error: 'Record not found' }, { status: 404 })
  }
  if (gen.status !== 'completed' || !gen.videoUrl) {
    return NextResponse.json({ error: 'Video generation not yet complete' }, { status: 409 })
  }
  // Content moderation rejected videos cannot be downloaded (compliance gate)
  if (gen.moderationStatus === 'rejected') {
    return NextResponse.json({ error: 'This video did not pass content moderation' }, { status: 403 })
  }

  // Server-side fetch of upstream video (SSRF protection: restrict upstream domains)
  const ALLOWED_DOMAINS = ['dashscope.aliyuncs.com', 'cn-beijing.oss.aliyuncs.com', 'cdn.siliconflow.cn', 'sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com']
  try {
    const urlHost = new URL(gen.videoUrl).hostname
    if (!ALLOWED_DOMAINS.some((d) => urlHost === d || urlHost.endsWith('.' + d))) {
      console.warn('Video download domain not in allowlist:', urlHost)
      return NextResponse.json({ error: 'Video source unavailable' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid video URL' }, { status: 502 })
  }
  const upstream = await fetch(gen.videoUrl)
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Failed to fetch video source, please try again later' }, { status: 502 })
  }

  // Stream forward + attachment header triggers browser download (works on mobile too)
  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
      'Content-Disposition': `attachment; filename="lumiere_${id}.mp4"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
