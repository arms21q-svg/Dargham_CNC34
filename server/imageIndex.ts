import sharp from 'sharp'
import { prisma } from './db'

const VECTOR_SIZE = 12
const VECTOR_DIM = VECTOR_SIZE * VECTOR_SIZE * 3 // 432

export type VisualFeatures = {
  hash: string
  vector: number[]
}

function hammingDistanceHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64
  let dist = 0
  for (let i = 0; i < a.length; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16)
    while (x) {
      dist += x & 1
      x >>= 1
    }
  }
  return dist
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

async function bufferFromSource(src: string): Promise<Buffer | null> {
  try {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1]
      if (!base64) return null
      return Buffer.from(base64, 'base64')
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      const res = await fetch(src, {
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    }

    return null
  } catch (err) {
    console.warn('[image-index] fetch failed', err instanceof Error ? err.message : err)
    return null
  }
}

export async function featuresFromBase64(
  imageBase64: string,
  _mimeType = 'image/jpeg'
): Promise<VisualFeatures | null> {
  try {
    const input = Buffer.from(imageBase64, 'base64')
    return await featuresFromBuffer(input)
  } catch (err) {
    console.warn('[image-index] featuresFromBase64', err instanceof Error ? err.message : err)
    return null
  }
}

export async function featuresFromBuffer(input: Buffer): Promise<VisualFeatures | null> {
  try {
    const gray = await sharp(input)
      .rotate()
      .resize(8, 8, { fit: 'fill' })
      .grayscale()
      .raw()
      .toBuffer()

    let sum = 0
    for (let i = 0; i < gray.length; i++) sum += gray[i]
    const mean = sum / gray.length
    let bits = ''
    for (let i = 0; i < gray.length; i++) bits += gray[i] >= mean ? '1' : '0'
    // pack to hex
    let hash = ''
    for (let i = 0; i < 64; i += 4) {
      hash += parseInt(bits.slice(i, i + 4), 2).toString(16)
    }

    const { data } = await sharp(input)
      .rotate()
      .resize(VECTOR_SIZE, VECTOR_SIZE, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const vector = new Array<number>(VECTOR_DIM)
    for (let i = 0; i < VECTOR_DIM; i++) {
      vector[i] = (data[i] ?? 0) / 255
    }

    // L2 normalize for stable cosine
    let norm = 0
    for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i]
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < vector.length; i++) vector[i] /= norm

    return { hash, vector }
  } catch (err) {
    console.warn('[image-index] featuresFromBuffer', err instanceof Error ? err.message : err)
    return null
  }
}

export async function featuresFromImageUrl(url: string): Promise<VisualFeatures | null> {
  const buf = await bufferFromSource(url)
  if (!buf) return null
  return featuresFromBuffer(buf)
}

/** Index products missing vectors or with changed image (best-effort). */
export async function ensureProductImageIndex(options?: {
  forceIds?: string[]
  limit?: number
}): Promise<{ indexed: number; failed: number }> {
  const limit = options?.limit ?? 40
  const products = await prisma.product.findMany({
    select: {
      id: true,
      image: true,
      imageHash: true,
      imageVector: true,
      indexedAt: true,
      updatedAt: true,
    },
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
  })

  const needs = products.filter((p) => {
    if (options?.forceIds?.includes(p.id)) return true
    if (!p.image) return false
    if (!p.imageHash || !p.imageVector || !p.indexedAt) return true
    // reindex if product updated after last index
    return p.updatedAt.getTime() > p.indexedAt.getTime()
  }).slice(0, limit)

  let indexed = 0
  let failed = 0

  for (const p of needs) {
    try {
      const feats = await featuresFromImageUrl(p.image)
      if (!feats) {
        failed += 1
        continue
      }
      await prisma.product.update({
        where: { id: p.id },
        data: {
          imageHash: feats.hash,
          imageVector: feats.vector,
          indexedAt: new Date(),
        },
      })
      indexed += 1
    } catch (err) {
      failed += 1
      console.warn('[image-index] product', p.id, err instanceof Error ? err.message : err)
    }
  }

  if (indexed || failed) {
    console.info('[image-index]', JSON.stringify({ indexed, failed, pending: needs.length }))
  }

  return { indexed, failed }
}

export type VisualMatch = {
  id: string
  score: number
  cosine: number
  hamming: number
}

/**
 * Rank all catalog images against the query by perceptual hash + RGB vector.
 * Works without Gemini — exact gallery uploads land at ~95–99%.
 */
export async function searchByVisualFeatures(
  queryBase64: string,
  mimeType: string
): Promise<VisualMatch[]> {
  const query = await featuresFromBase64(queryBase64, mimeType)
  if (!query) return []

  // Ensure index is warm (non-blocking best-effort for missing rows)
  await ensureProductImageIndex({ limit: 60 })

  const products = await prisma.product.findMany({
    select: {
      id: true,
      imageHash: true,
      imageVector: true,
    },
  })

  const scored: VisualMatch[] = []

  for (const p of products) {
    const vec = Array.isArray(p.imageVector)
      ? (p.imageVector as number[])
      : null
    if (!vec || vec.length !== query.vector.length) continue

    const cosine = cosineSimilarity(query.vector, vec)
    const hamming = p.imageHash ? hammingDistanceHex(query.hash, p.imageHash) : 64

    // Hash: distance 0 → 99, distance 10 → ~85
    const hashScore =
      hamming <= 12 ? Math.max(70, Math.round(99 - hamming * 1.4)) : Math.max(0, 70 - (hamming - 12) * 3)

    // Cosine for normalized RGB vectors: identical ≈ 0.98–1.0
    const vectorScore = Math.max(0, Math.min(99, Math.round((cosine - 0.55) / 0.45 * 99)))

    // Prefer hash for near-duplicates; blend otherwise
    let score: number
    if (hamming <= 6) {
      score = Math.max(hashScore, vectorScore, 94)
    } else if (hamming <= 12 || cosine >= 0.92) {
      score = Math.round(Math.max(hashScore, vectorScore) * 0.55 + Math.min(hashScore, vectorScore) * 0.45)
      score = Math.max(score, Math.round((hashScore + vectorScore) / 2))
    } else {
      score = Math.round(vectorScore * 0.75 + hashScore * 0.25)
    }

    score = Math.max(0, Math.min(99, score))
    if (score < 35) continue

    scored.push({ id: p.id, score, cosine, hamming })
  }

  scored.sort((a, b) => b.score - a.score || a.hamming - b.hamming)
  return scored
}

/** Fire-and-forget reindex after admin publishes products. */
export function scheduleProductImageReindex(forceIds?: string[]) {
  void ensureProductImageIndex({ forceIds, limit: 80 }).catch((err) => {
    console.warn('[image-index] schedule failed', err instanceof Error ? err.message : err)
  })
}
