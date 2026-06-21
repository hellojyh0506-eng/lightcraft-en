// 客户端视频导出 — WebCodecs + mp4-muxer 输出 MP4，MediaRecorder 兜底输出 WebM
// 非破坏性：原始视频不变，导出创建新文件
// 成本：纯浏览器处理，零服务器开销

import type { PlatformPreset } from './platforms'
import type { TextOverlay } from './text-overlay'
import type { Voiceover } from './voiceover'
import { type BrandKit, loadLogoImage } from './brand-kit'

export interface ExportProgress {
  phase: 'loading' | 'processing' | 'encoding' | 'done' | 'error'
  percent: number
  error?: string
}

function supportsMP4Export(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

// ── 公共入口 ──────────────────────────────────────────────

export async function exportVideoForPlatform(
  videoUrl: string,
  platform: PlatformPreset,
  textOverlay?: TextOverlay,
  brandKit?: BrandKit | null,
  onProgress?: (p: ExportProgress) => void,
  voiceover?: Voiceover,
): Promise<Blob> {
  const report = (phase: ExportProgress['phase'], percent: number) =>
    onProgress?.({ phase, percent })

  report('loading', 0)

  // 1. Fetch 视频为 ArrayBuffer（同时用于视频元素加载和音频解码）
  let videoBuffer: ArrayBuffer
  try {
    const resp = await fetch(videoUrl)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    videoBuffer = await resp.arrayBuffer()
  } catch (err) {
    throw new Error(`Failed to download video: ${(err as Error).message}`)
  }

  const blob = new Blob([videoBuffer])
  const blobUrl = URL.createObjectURL(blob)

  // 2. 加载视频元素
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve()
    video.onerror = () => reject(new Error('Failed to load video'))
    setTimeout(() => reject(new Error('Video load timeout')), 30_000)
    video.src = blobUrl
  })

  report('loading', 40)

  const srcW = video.videoWidth
  const srcH = video.videoHeight
  let duration = video.duration

  if (!srcW || !srcH || !duration) {
    URL.revokeObjectURL(blobUrl)
    throw new Error('Invalid video dimensions or duration')
  }

  // G3 修复：平台最大时长裁剪
  if (platform.maxDurationSec && duration > platform.maxDurationSec) {
    duration = platform.maxDurationSec
  }

  // 3. 计算中心裁剪区域
  const targetW = platform.width
  const targetH = platform.height
  const targetAspect = targetW / targetH
  const srcAspect = srcW / srcH

  let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH
  if (srcAspect > targetAspect) {
    cropW = Math.round(srcH * targetAspect)
    cropX = Math.round((srcW - cropW) / 2)
  } else {
    cropH = Math.round(srcW / targetAspect)
    cropY = Math.round((srcH - cropH) / 2)
  }

  // 4. Canvas + 叠加层
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')!

  let logoImg: HTMLImageElement | null = null
  if (brandKit?.enabled && brandKit.logoDataUrl) {
    try { logoImg = await loadLogoImage(brandKit.logoDataUrl) } catch { /* skip */ }
  }

  report('loading', 60)

  const drawOverlays = () => {
    drawTextOverlay(ctx, targetW, targetH, textOverlay)
    drawBrandOverlay(ctx, targetW, targetH, brandKit, logoImg)
  }

  // 5. 编码
  try {
    if (supportsMP4Export()) {
      return await encodeMP4(video, canvas, ctx, {
        cropX, cropY, cropW, cropH, targetW, targetH,
        duration, platform, voiceover, videoBuffer, drawOverlays, report,
      })
    }
    return await encodeWebM(video, canvas, ctx, {
      cropX, cropY, cropW, cropH, targetW, targetH,
      duration, platform, voiceover, drawOverlays, report,
    })
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

// ── MP4 编码（WebCodecs + mp4-muxer）──────────────────────

interface EncodeParams {
  cropX: number; cropY: number; cropW: number; cropH: number
  targetW: number; targetH: number; duration: number
  platform: PlatformPreset
  voiceover?: Voiceover
  drawOverlays: () => void
  report: (phase: ExportProgress['phase'], percent: number) => void
}

interface MP4Params extends EncodeParams {
  videoBuffer: ArrayBuffer
}

async function encodeMP4(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  p: MP4Params,
): Promise<Blob> {
  const { Muxer, ArrayBufferTarget } = await import('mp4-muxer')

  const fps = 30
  const totalFrames = Math.ceil(p.duration * fps)

  // 解码音频轨：优先使用配音，否则用源视频音频
  let audioBuffer: AudioBuffer | null = null
  if (!p.platform.stripAudio) {
    if (p.voiceover?.audioUrl) {
      try {
        const audioCtx = new AudioContext()
        const resp = await fetch(p.voiceover.audioUrl)
        const buf = await resp.arrayBuffer()
        audioBuffer = await audioCtx.decodeAudioData(buf)
        await audioCtx.close()
      } catch { /* 配音解码失败，回退静默 */ }
    } else {
      try {
        const audioCtx = new AudioContext()
        audioBuffer = await audioCtx.decodeAudioData(p.videoBuffer.slice(0))
        await audioCtx.close()
      } catch { /* 源视频无音轨或解码失败 */ }
    }
  }

  const hasAudio = !!audioBuffer && !p.platform.stripAudio
  const sampleRate = audioBuffer?.sampleRate ?? 48000
  const numChannels = audioBuffer?.numberOfChannels ?? 2

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: p.targetW, height: p.targetH },
    ...(hasAudio ? { audio: { codec: 'aac', numberOfChannels: numChannels, sampleRate } } : {}),
    fastStart: 'in-memory',
  })

  // 视频编码器
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { throw e },
  })

  videoEncoder.configure({
    codec: 'avc1.42001f',
    width: p.targetW,
    height: p.targetH,
    bitrate: 4_000_000,
    framerate: fps,
  })

  // 音频编码器
  let audioEncoder: AudioEncoder | null = null
  if (hasAudio) {
    try {
      audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: () => { audioEncoder = null },
      })
      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: numChannels,
        sampleRate,
        bitrate: 128_000,
      })
    } catch {
      audioEncoder = null
    }
  }

  p.report('processing', 0)

  // 逐帧 seek → draw → encode
  for (let i = 0; i < totalFrames; i++) {
    const time = i / fps
    if (time > p.duration) break

    video.currentTime = time
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      setTimeout(resolve, 200)
    })

    ctx.drawImage(video, p.cropX, p.cropY, p.cropW, p.cropH, 0, 0, p.targetW, p.targetH)
    p.drawOverlays()

    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * (1_000_000 / fps)) })
    videoEncoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
    frame.close()

    p.report('processing', Math.round((i / totalFrames) * 85))
  }

  // 音频编码（整段处理）
  if (audioEncoder && audioBuffer) {
    const clampedLength = Math.min(audioBuffer.length, Math.ceil(p.duration * sampleRate))
    const chunkSize = 1024
    for (let offset = 0; offset < clampedLength; offset += chunkSize) {
      const frames = Math.min(chunkSize, clampedLength - offset)
      const planar = new Float32Array(frames * numChannels)
      for (let ch = 0; ch < numChannels; ch++) {
        const chData = audioBuffer.getChannelData(ch)
        planar.set(chData.subarray(offset, offset + frames), ch * frames)
      }
      const audioData = new AudioData({
        format: 'f32-planar',
        sampleRate,
        numberOfFrames: frames,
        numberOfChannels: numChannels,
        timestamp: Math.round((offset / sampleRate) * 1_000_000),
        data: planar,
      })
      audioEncoder.encode(audioData)
      audioData.close()
    }
  }

  p.report('encoding', 90)

  await videoEncoder.flush()
  videoEncoder.close()
  if (audioEncoder) {
    await audioEncoder.flush()
    audioEncoder.close()
  }

  muxer.finalize()
  p.report('done', 100)

  return new Blob([target.buffer], { type: 'video/mp4' })
}

// ── WebM 编码（MediaRecorder 兜底）─────────────────────────

async function encodeWebM(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  p: EncodeParams,
): Promise<Blob> {
  const fps = 30
  const stream = canvas.captureStream(fps)

  let webmAudioCtx: AudioContext | null = null
  let webmAudioSource: AudioBufferSourceNode | null = null

  if (!p.platform.stripAudio) {
    try {
      const audioCtx = new AudioContext()
      webmAudioCtx = audioCtx
      const dest = audioCtx.createMediaStreamDestination()

      if (p.voiceover?.audioUrl) {
        const resp = await fetch(p.voiceover.audioUrl)
        const buf = await resp.arrayBuffer()
        const decoded = await audioCtx.decodeAudioData(buf)
        const source = audioCtx.createBufferSource()
        source.buffer = decoded
        source.connect(dest)
        webmAudioSource = source
      } else {
        const source = audioCtx.createMediaElementSource(video)
        source.connect(dest)
        source.connect(audioCtx.destination)
      }

      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t))
    } catch {
      console.warn('Could not capture audio track, exporting without audio')
    }
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm'

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

  p.report('processing', 0)

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      p.report('encoding', 95)
      resolve(new Blob(chunks, { type: mimeType }))
      p.report('done', 100)
    }
    recorder.onerror = () => reject(new Error('Recording failed'))
    recorder.start()

    video.currentTime = 0
    video.playbackRate = 1

    function drawFrame() {
      if (video.ended || video.paused || video.currentTime >= p.duration) {
        recorder.stop()
        return
      }
      ctx.drawImage(video, p.cropX, p.cropY, p.cropW, p.cropH, 0, 0, p.targetW, p.targetH)
      p.drawOverlays()
      const pct = Math.min(90, Math.round((video.currentTime / p.duration) * 90))
      p.report('processing', pct)
      requestAnimationFrame(drawFrame)
    }

    video.onended = () => {
      ctx.drawImage(video, p.cropX, p.cropY, p.cropW, p.cropH, 0, 0, p.targetW, p.targetH)
      p.drawOverlays()
      setTimeout(() => recorder.stop(), 100)
    }

    // G3: WebM 路径也在 duration 到时主动停止
    const maxMs = p.duration * 1000 + 500
    const durationGuard = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop()
    }, maxMs)
    recorder.addEventListener('stop', () => clearTimeout(durationGuard), { once: true })

    video.play().then(() => {
      webmAudioSource?.start()
      drawFrame()
    }).catch((err) => {
      recorder.stop()
      reject(new Error(`Video playback failed: ${err.message}`))
    })
  })
}

// ── 叠加层绘制 ──────────────────────────────────────────────

function drawTextOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, overlay?: TextOverlay) {
  if (!overlay?.text) return
  const scale = w / 1080
  const fontSize = Math.round(overlay.fontSize * scale)
  ctx.font = `600 ${fontSize}px ${overlay.fontFamily}, sans-serif`
  ctx.textAlign = 'center'

  const metrics = ctx.measureText(overlay.text)
  const padX = Math.round(16 * scale)
  const padY = Math.round(8 * scale)
  const boxW = metrics.width + padX * 2
  const boxH = fontSize + padY * 2

  let boxY: number
  if (overlay.position === 'top') boxY = Math.round(12 * scale)
  else if (overlay.position === 'center') boxY = Math.round((h - boxH) / 2)
  else boxY = h - boxH - Math.round(12 * scale)
  const boxX = Math.round((w - boxW) / 2)

  ctx.fillStyle = overlay.bgColor
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, boxW, boxH, Math.round(8 * scale))
  ctx.fill()

  ctx.fillStyle = overlay.color
  ctx.textBaseline = 'middle'
  ctx.fillText(overlay.text, w / 2, boxY + boxH / 2)
}

function drawBrandOverlay(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  brandKit?: BrandKit | null,
  logoImg?: HTMLImageElement | null,
) {
  if (!brandKit?.enabled) return
  const scale = w / 1080
  const margin = Math.round(12 * scale)

  // Logo 位置计算
  let anchorX = margin
  let anchorY = margin
  if (brandKit.logoPosition.includes('right')) anchorX = w - margin
  if (brandKit.logoPosition.includes('bottom')) anchorY = h - margin

  const isRight = brandKit.logoPosition.includes('right')
  const isBottom = brandKit.logoPosition.includes('bottom')

  // 绘制 logo
  if (logoImg) {
    const logoW = Math.round(w * brandKit.logoScale)
    const logoH = Math.round(logoW * (logoImg.height / logoImg.width))
    const lx = isRight ? anchorX - logoW : anchorX
    const ly = isBottom ? anchorY - logoH : anchorY
    ctx.drawImage(logoImg, lx, ly, logoW, logoH)

    // G4 修复：绘制品牌名（logo 下方或上方）
    if (brandKit.brandName) {
      const nameSize = Math.round(14 * scale)
      ctx.font = `500 ${nameSize}px ${brandKit.fontFamily || 'Inter'}, sans-serif`
      ctx.textAlign = isRight ? 'right' : 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = brandKit.primaryColor || '#ffffff'
      const nameX = isRight ? anchorX : anchorX
      const nameY = isBottom ? ly - nameSize - Math.round(4 * scale) : ly + logoH + Math.round(4 * scale)
      ctx.fillText(brandKit.brandName, nameX, nameY)
    }
  } else if (brandKit.brandName) {
    // 无 logo 时单独显示品牌名
    const nameSize = Math.round(16 * scale)
    ctx.font = `600 ${nameSize}px ${brandKit.fontFamily || 'Inter'}, sans-serif`
    ctx.textAlign = isRight ? 'right' : 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = brandKit.primaryColor || '#ffffff'
    ctx.fillText(brandKit.brandName, isRight ? anchorX : anchorX, isBottom ? anchorY - nameSize : anchorY)
  }
}

// ── 下载 ──────────────────────────────────────────────────

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
