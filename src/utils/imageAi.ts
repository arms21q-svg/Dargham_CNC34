import { apiUrl } from './apiBase'

const MAX_FILE_SIZE = 8 * 1024 * 1024

export interface PreparedImage {
  base64: string
  mimeType: string
  dataUrl: string
}

export async function prepareImageFile(file: File, maxWidth = 900, quality = 0.85): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى 8 ميجابايت')
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('تعذر معالجة الصورة')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const dataUrl = canvas.toDataURL(mimeType, quality)
  const base64 = dataUrl.split(',')[1] ?? ''

  if (!base64) {
    throw new Error('تعذر تحويل الصورة')
  }

  return { base64, mimeType, dataUrl }
}

export interface ImageSearchMatch {
  id: string
  score: number
}

export interface ImageSearchApiResult {
  productIds: string[]
  matches: ImageSearchMatch[]
  analysis?: {
    workType?: string
    materials?: string[]
    design?: string
    techniques?: string[]
    summary?: string
    tags?: string[]
  } | null
  softMatch?: boolean
  analysisNote?: string
  mode: string
}

export async function searchProductsByImage(
  file: File,
  lang: 'ar' | 'en',
  signal?: AbortSignal
): Promise<ImageSearchApiResult | null> {
  const { base64, mimeType } = await prepareImageFile(file, 1024, 0.88)
  const res = await fetch(apiUrl('/api/ai-search-by-image'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType, lang }),
    signal,
  })

  if (!res.ok) return null

  const json = (await res.json()) as {
    ok?: boolean
    productIds?: string[]
    matches?: ImageSearchMatch[]
    analysis?: ImageSearchApiResult['analysis']
    softMatch?: boolean
    analysisNote?: string
    mode?: string
  }

  if (!json.ok) return null

  const matches =
    json.matches?.length
      ? json.matches
      : (json.productIds ?? []).map((id, i) => ({ id, score: Math.max(70, 98 - i * 4) }))

  return {
    productIds: matches.map((m) => m.id),
    matches,
    analysis: json.analysis,
    softMatch: Boolean(json.softMatch),
    analysisNote: json.analysisNote,
    mode: json.mode ?? 'unknown',
  }
}

/** Apply rotation (degrees) and optional center-square crop, return a File ready for search. */
export async function processImageForSearch(
  source: Blob | File,
  options: { rotation?: number; squareCrop?: boolean } = {}
): Promise<File> {
  const rotation = ((options.rotation ?? 0) % 360 + 360) % 360
  const squareCrop = Boolean(options.squareCrop)
  const bitmap = await createImageBitmap(source)

  try {
    let srcW = bitmap.width
    let srcH = bitmap.height
    let sx = 0
    let sy = 0

    if (squareCrop) {
      const side = Math.min(srcW, srcH)
      sx = Math.floor((srcW - side) / 2)
      sy = Math.floor((srcH - side) / 2)
      srcW = side
      srcH = side
    }

    const swapped = rotation === 90 || rotation === 270
    const outW = swapped ? srcH : srcW
    const outH = swapped ? srcW : srcH
    const maxSide = 1024
    const scale = Math.min(1, maxSide / Math.max(outW, outH))
    const canvasW = Math.max(1, Math.round(outW * scale))
    const canvasH = Math.max(1, Math.round(outH * scale))

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('تعذر معالجة الصورة')

    ctx.translate(canvasW / 2, canvasH / 2)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.drawImage(
      bitmap,
      sx,
      sy,
      srcW,
      srcH,
      (-srcW * scale) / 2,
      (-srcH * scale) / 2,
      srcW * scale,
      srcH * scale
    )

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('تعذر تحويل الصورة'))),
        'image/jpeg',
        0.88
      )
    })

    return new File([blob], 'search.jpg', { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}
