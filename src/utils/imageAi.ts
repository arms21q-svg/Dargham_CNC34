import { apiUrl } from './apiBase'

const MAX_FILE_SIZE = 8 * 1024 * 1024

export interface PreparedImage {
  base64: string
  mimeType: string
  dataUrl: string
}

export interface ImageSearchAnalysis {
  workType?: string
  materials?: string[]
  design?: string
  techniques?: string[]
  summary?: string
  tags?: string[]
}

export interface ImageSearchMatch {
  id: string
  score: number
}

export interface ImageSearchApiResult {
  productIds: string[]
  matches: ImageSearchMatch[]
  analysis?: ImageSearchAnalysis | null
  softMatch?: boolean
  analysisNote?: string
  mode: string
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

export async function searchProductsByImage(
  file: File,
  lang: 'ar' | 'en',
  signal?: AbortSignal
): Promise<ImageSearchApiResult | null> {
  const { base64, mimeType } = await prepareImageFile(file)
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
    analysis?: ImageSearchAnalysis | null
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

export async function analyzeImageWithAi(
  file: File,
  lang: 'ar' | 'en',
  message?: string
): Promise<{ reply: string; mode: string } | null> {
  const { base64, mimeType } = await prepareImageFile(file)
  const res = await fetch(apiUrl('/api/ai-analyze-image'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType, lang, message }),
  })

  if (!res.ok) return null

  const json = (await res.json()) as { ok?: boolean; reply?: string; mode?: string }
  if (!json.ok || !json.reply) return null

  return { reply: json.reply, mode: json.mode ?? 'unknown' }
}
