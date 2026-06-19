// Browser-side image compression — proportional scaling + re-encoding before upload, prevents large phone images (3-8MB) from triggering request body limit (413) after base64 expansion
// Called by the creative page client component (depends on canvas / Image, runs only in browser)

export const MAX_IMAGE_EDGE = 1536 // Max longest edge in pixels after compression
export const MAX_UPLOAD_BYTES = 16 * 1024 * 1024 // Hard limit on original image size (before compression)

// Image processing errors — carries user-facing messages
export class ImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageError'
  }
}

// Proportional scaling: ensure longest edge does not exceed maxEdge
function scaleToFit(w: number, h: number, maxEdge: number): { width: number; height: number } {
  if (w <= maxEdge && h <= maxEdge) return { width: w, height: h }
  const ratio = w >= h ? maxEdge / w : maxEdge / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

// Load image element via object URL (need to decode before getting natural dimensions)
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageError('Failed to read image. Please try a different one'))
    }
    img.src = url
  })
}

/**
 * Compress a single image to JPEG dataURL.
 * - Validates type and original file size
 * - Scales longest edge to within MAX_IMAGE_EDGE
 * - Re-encodes to JPEG (with white background, removes alpha channel), significantly reducing size
 * Throws ImageError on failure.
 */
export async function compressImage(
  file: File,
  maxEdge: number = MAX_IMAGE_EDGE,
  quality: number = 0.85,
  format: 'jpeg' | 'png' = 'jpeg',
): Promise<{ dataUrl: string; name: string }> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('Not a valid image file')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    throw new ImageError(`Image too large (${mb}MB). Please compress to under 16MB before uploading`)
  }

  const img = await loadImage(file)
  const { width, height } = scaleToFit(img.naturalWidth, img.naturalHeight, maxEdge)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageError('Your browser does not support image processing')

  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }
  ctx.drawImage(img, 0, 0, width, height)

  const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality : undefined)
  return { dataUrl, name: file.name }
}
