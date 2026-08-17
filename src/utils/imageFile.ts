/** Max input file size before compression (any aspect ratio accepted). */
export const MAX_IMAGE_FILE_SIZE = 12 * 1024 * 1024
/** Target max chars for embedded data URLs in publish payloads. */
export const MAX_DATA_URL_CHARS = 700_000
/** Skip recompression when admin opts in and file is under this size. */
export const PRESERVE_ORIGINAL_MAX = 2 * 1024 * 1024

export type ImageUploadOptions = {
  /** Longest side in pixels after resize (default 1200). */
  maxSide?: number
  /** JPEG/WebP quality 0–1 (default 0.78). */
  quality?: number
  /** Store original file without resize when under PRESERVE_ORIGINAL_MAX. */
  preserveOriginal?: boolean
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') resolve(result)
      else reject(new Error('تعذر قراءة الصورة'))
    }
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'))
    reader.readAsDataURL(file)
  })
}

function drawScaled(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  maxSide: number
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('تعذر معالجة الصورة')
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

function encodeCanvas(
  canvas: HTMLCanvasElement,
  preferPng: boolean,
  quality: number
): string {
  return preferPng
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', quality)
}

/**
 * Accept any image dimensions/aspect ratio — portrait, landscape, or square.
 * Scales down the longest side for performance; never crops or distorts.
 */
export async function fileToDataUrl(
  file: File,
  maxSideOrOptions: number | ImageUploadOptions = 1200,
  legacyQuality = 0.78
): Promise<string> {
  const options: ImageUploadOptions =
    typeof maxSideOrOptions === 'number'
      ? { maxSide: maxSideOrOptions, quality: legacyQuality }
      : maxSideOrOptions

  const maxSide = options.maxSide ?? 1200
  const quality = options.quality ?? 0.78
  const preserveOriginal = options.preserveOriginal ?? false

  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة (JPG, PNG, WebP, GIF…)')
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(
      `حجم الصورة كبير جداً (${formatFileSize(file.size)}). الحد الأقصى ${formatFileSize(MAX_IMAGE_FILE_SIZE)}`
    )
  }

  if (preserveOriginal && file.size <= PRESERVE_ORIGINAL_MAX) {
    const raw = await readFileAsDataUrl(file)
    if (raw.length > MAX_DATA_URL_CHARS) {
      throw new Error(
        'الصورة الأصلية كبيرة للتخزين. أزل «حفظ الأصل» أو استخدم صورة أصغر'
      )
    }
    return raw
  }

  const bitmap = await createImageBitmap(file)
  const srcW = bitmap.width
  const srcH = bitmap.height

  let canvas = drawScaled(bitmap, srcW, srcH, maxSide)
  bitmap.close()

  const preferPng = file.type === 'image/png' || file.type === 'image/webp'
  let dataUrl = encodeCanvas(canvas, preferPng, quality)

  const steps: Array<{ side: number; quality: number; forceJpeg: boolean }> = [
    { side: maxSide, quality: Math.min(quality, 0.68), forceJpeg: true },
    { side: 960, quality: 0.62, forceJpeg: true },
    { side: 720, quality: 0.55, forceJpeg: true },
  ]

  for (const step of steps) {
    if (dataUrl.length <= MAX_DATA_URL_CHARS) break
    canvas = drawScaled(canvas, canvas.width, canvas.height, step.side)
    dataUrl = encodeCanvas(canvas, preferPng && !step.forceJpeg, step.quality)
  }

  if (dataUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(
      'الصورة كبيرة بعد الضغط. جرّب صورة أقل دقة أو فعّل «حفظ الأصل» لملف صغير'
    )
  }

  return dataUrl
}

/** Re-compress an existing data URL to fit publish payload budget (browser only). */
export async function compressDataUrlForPublish(
  dataUrl: string,
  maxChars: number
): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl
  if (dataUrl.length <= maxChars) return dataUrl
  if (typeof document === 'undefined') return dataUrl

  const img = await loadImageElement(dataUrl)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height

  const steps: Array<{ side: number; quality: number }> = [
    { side: 1000, quality: 0.68 },
    { side: 880, quality: 0.62 },
    { side: 760, quality: 0.56 },
    { side: 640, quality: 0.5 },
    { side: 520, quality: 0.45 },
    { side: 420, quality: 0.4 },
  ]

  let best = dataUrl
  for (const step of steps) {
    const canvas = drawScaled(img, srcW, srcH, step.side)
    const candidate = canvas.toDataURL('image/jpeg', step.quality)
    best = candidate
    if (candidate.length <= maxChars) return candidate
  }

  return best
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('تعذر قراءة الصورة للضغط'))
    img.src = src
  })
}

/** Fast fingerprint for duplicate detection during bulk upload. */
export async function fileFingerprint(file: File): Promise<string> {
  const sample = file.slice(0, Math.min(file.size, 512 * 1024))
  const buf = await sample.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
