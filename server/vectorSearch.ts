import { prisma } from './db'
import { callGemini } from './aiCore'

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004'
const CACHE_TTL_MS = 10 * 60_000
const STRONG_MATCH_THRESHOLD = 72

export interface ImageAnalysis {
  workType: string
  materials: string[]
  design: string
  techniques: string[]
  summary: string
  tags: string[]
}

export interface ScoredMatch {
  id: string
  score: number
}

type ProductRow = {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  category: string
  materialsAr: string
  materialsEn: string
  colors: string[]
  featured: boolean
  updatedAt: Date
}

type EmbeddingCache = {
  fingerprint: string
  at: number
  vectors: Map<string, number[]>
  products: ProductRow[]
}

let embeddingCache: EmbeddingCache | null = null

function cosineSimilarity(a: number[], b: number[]): number {
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

function productDocument(p: ProductRow): string {
  return [
    p.titleAr,
    p.titleEn,
    p.descriptionAr,
    p.descriptionEn,
    p.category,
    p.materialsAr,
    p.materialsEn,
    p.colors.join(' '),
    p.featured ? 'featured' : '',
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 1200)
}

function analysisQueryText(analysis: ImageAnalysis): string {
  return [
    analysis.workType,
    analysis.design,
    analysis.summary,
    analysis.materials.join(' '),
    analysis.techniques.join(' '),
    analysis.tags.join(' '),
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 1200)
}

function fingerprint(products: ProductRow[]): string {
  return products.map((p) => `${p.id}:${p.updatedAt.getTime()}`).join('|')
}

async function embedBatch(
  apiKey: string,
  texts: string[],
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
): Promise<(number[] | null)[]> {
  const out: (number[] | null)[] = []
  const CHUNK = 16

  for (let i = 0; i < texts.length; i += CHUNK) {
    const chunk = texts.slice(i, i + CHUNK)
    const requests = chunk.map((text) => ({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text }] },
      taskType,
    }))

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    })

    if (!res.ok) {
      console.error('Gemini embed error:', (await res.text()).slice(0, 400))
      out.push(...chunk.map(() => null))
      continue
    }

    const data = (await res.json()) as {
      embeddings?: { values?: number[] }[]
    }

    const embeddings = data.embeddings ?? []
    for (let j = 0; j < chunk.length; j++) {
      out.push(embeddings[j]?.values ?? null)
    }
  }

  return out
}

async function loadProducts(): Promise<ProductRow[]> {
  return prisma.product.findMany({
    orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      titleAr: true,
      titleEn: true,
      descriptionAr: true,
      descriptionEn: true,
      category: true,
      materialsAr: true,
      materialsEn: true,
      colors: true,
      featured: true,
      updatedAt: true,
    },
  })
}

async function ensureProductEmbeddings(apiKey: string): Promise<EmbeddingCache | null> {
  const products = await loadProducts()
  if (products.length === 0) return null

  const fp = fingerprint(products)
  const now = Date.now()
  if (
    embeddingCache &&
    embeddingCache.fingerprint === fp &&
    now - embeddingCache.at < CACHE_TTL_MS
  ) {
    return embeddingCache
  }

  const vectors = await embedBatch(
    apiKey,
    products.map(productDocument),
    'RETRIEVAL_DOCUMENT'
  )

  const map = new Map<string, number[]>()
  products.forEach((p, i) => {
    const v = vectors[i]
    if (v?.length) map.set(p.id, v)
  })

  if (map.size === 0) return null

  embeddingCache = {
    fingerprint: fp,
    at: now,
    vectors: map,
    products,
  }
  return embeddingCache
}

function parseAnalysisJson(text: string): ImageAnalysis | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const raw = JSON.parse(match[0]) as Record<string, unknown>
    const asList = (v: unknown) =>
      Array.isArray(v)
        ? v.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter(Boolean)
        : typeof v === 'string'
          ? v.split(/[,،|/]/).map((s) => s.trim()).filter(Boolean)
          : []

    return {
      workType: typeof raw.workType === 'string' ? raw.workType.trim() : '',
      materials: asList(raw.materials),
      design: typeof raw.design === 'string' ? raw.design.trim() : '',
      techniques: asList(raw.techniques),
      summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
      tags: asList(raw.tags),
    }
  } catch {
    return null
  }
}

export async function analyzeImageStructured(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  lang: 'ar' | 'en'
): Promise<ImageAnalysis | null> {
  const prompt =
    lang === 'ar'
      ? `حلّل صورة عمل CNC/ديكور. أعد JSON فقط بهذا الشكل بدون شرح:
{"workType":"نوع العمل","materials":["خامات"],"design":"وصف التصميم","techniques":["حفر|قص ليزر|نقش|..."],"summary":"ملخص قصير للبحث","tags":["mdf","acrylic","metal","carve","laser","engraving","facade","decor"]}`
      : `Analyze this CNC/décor work image. Return JSON only:
{"workType":"...","materials":[],"design":"...","techniques":[],"summary":"short search summary","tags":["mdf","acrylic","metal","carve","laser","engraving","facade","decor"]}`

  const reply = await callGemini(apiKey, 'You extract structured CNC work metadata as JSON only.', [], [
    { inlineData: { mimeType, data: imageBase64 } },
    { text: prompt },
  ])

  if (!reply) return null
  const parsed = parseAnalysisJson(reply)
  if (parsed && (parsed.summary || parsed.workType || parsed.design)) return parsed

  // fallback: use raw reply as summary
  return {
    workType: '',
    materials: [],
    design: '',
    techniques: [],
    summary: reply.slice(0, 400),
    tags: [],
  }
}

function toPercentScores(pairs: { id: string; cosine: number }[]): ScoredMatch[] {
  if (pairs.length === 0) return []
  const max = pairs[0].cosine
  const min = pairs[pairs.length - 1].cosine
  const span = Math.max(0.0001, max - min)

  return pairs.map((p, index) => {
    // Rank-aware mapping so top results look like 98 / 95 / 90…
    const relative = (p.cosine - min) / span
    const rankBoost = Math.max(0, 1 - index * 0.035)
    const score = Math.round(Math.min(98, Math.max(42, 52 + relative * 40 + rankBoost * 6)))
    return { id: p.id, score }
  })
}

/** Vector search over full catalog using Gemini embeddings. */
export async function searchProductsByImageEmbeddings(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  lang: 'ar' | 'en'
): Promise<{
  matches: ScoredMatch[]
  analysis: ImageAnalysis | null
  softMatch: boolean
  mode: string
} | null> {
  const analysis = await analyzeImageStructured(apiKey, imageBase64, mimeType, lang)
  if (!analysis) return null

  const cache = await ensureProductEmbeddings(apiKey)
  if (!cache || cache.vectors.size === 0) return null

  const queryVecs = await embedBatch(apiKey, [analysisQueryText(analysis)], 'RETRIEVAL_QUERY')
  const query = queryVecs[0]
  if (!query?.length) return null

  const scored: { id: string; cosine: number }[] = []
  for (const [id, vec] of cache.vectors) {
    scored.push({ id, cosine: cosineSimilarity(query, vec) })
  }

  scored.sort((a, b) => b.cosine - a.cosine)
  const top = scored.slice(0, 12)
  const matches = toPercentScores(top)
  const softMatch = !matches.length || matches[0].score < STRONG_MATCH_THRESHOLD

  return {
    matches: softMatch ? matches.slice(0, 8) : matches.filter((m) => m.score >= 48).slice(0, 10),
    analysis,
    softMatch,
    mode: 'embedding',
  }
}

/** Keyword soft-rank using analysis tags against product text (no API). */
export function localTagRank(
  analysis: ImageAnalysis,
  products: ProductRow[],
  limit = 8
): ScoredMatch[] {
  const needles = [
    ...analysis.materials,
    ...analysis.techniques,
    ...analysis.tags,
    analysis.workType,
    ...analysis.summary.split(/\s+/).filter((w) => w.length > 3),
  ]
    .map((s) => s.toLowerCase())
    .filter(Boolean)

  if (!needles.length) return []

  const ranked = products
    .map((p) => {
      const hay = productDocument(p).toLowerCase()
      let hits = 0
      for (const n of needles) {
        if (hay.includes(n.toLowerCase())) hits += 1
      }
      const score = Math.min(92, 50 + hits * 8)
      return { id: p.id, score, hits }
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return ranked.map(({ id, score }) => ({ id, score }))
}

export async function loadCatalogForLocal(): Promise<ProductRow[]> {
  return loadProducts()
}
