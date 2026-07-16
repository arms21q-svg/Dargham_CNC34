import { prisma } from './db'
import { callGemini } from './aiCore'
import {
  ensureProductImageIndex,
  searchByVisualFeatures,
  type VisualMatch,
} from './imageIndex'
import { getGeminiApiKey } from './geminiClient'

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || 'text-embedding-004'
const TEXT_CACHE_TTL_MS = 10 * 60_000
const STRONG_MATCH_THRESHOLD = 78

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
  image: string
}

type TextEmbeddingCache = {
  fingerprint: string
  at: number
  vectors: Map<string, number[]>
  products: ProductRow[]
}

let textEmbeddingCache: TextEmbeddingCache | null = null

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

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
        signal: AbortSignal.timeout(20_000),
      })

      if (!res.ok) {
        const err = (await res.text()).slice(0, 300)
        console.error('[ai] embed error', res.status, err)
        // On 429/503 leave nulls — visual search still works
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
    } catch (err) {
      console.error('[ai] embed fetch', err instanceof Error ? err.message : err)
      out.push(...chunk.map(() => null))
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
      image: true,
    },
  })
}

async function ensureTextEmbeddings(apiKey: string): Promise<TextEmbeddingCache | null> {
  const products = await loadProducts()
  if (products.length === 0) return null

  const fp = fingerprint(products)
  const now = Date.now()
  if (
    textEmbeddingCache &&
    textEmbeddingCache.fingerprint === fp &&
    now - textEmbeddingCache.at < TEXT_CACHE_TTL_MS
  ) {
    return textEmbeddingCache
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

  textEmbeddingCache = {
    fingerprint: fp,
    at: now,
    vectors: map,
    products,
  }
  return textEmbeddingCache
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

  try {
    const result = await callGemini(
      apiKey,
      'You extract structured CNC work metadata as JSON only.',
      [],
      [
        { inlineData: { mimeType, data: imageBase64 } },
        { text: prompt },
      ]
    )

    const reply = result.text
    if (!reply) return null
    const parsed = parseAnalysisJson(reply)
    if (parsed && (parsed.summary || parsed.workType || parsed.design)) return parsed

    return {
      workType: '',
      materials: [],
      design: '',
      techniques: [],
      summary: reply.slice(0, 400),
      tags: [],
    }
  } catch (err) {
    console.error('[ai] analyzeImageStructured', err instanceof Error ? err.message : err)
    return null
  }
}

function mergeScores(
  visual: VisualMatch[],
  textMatches: ScoredMatch[]
): ScoredMatch[] {
  const map = new Map<string, number>()

  for (const v of visual) {
    map.set(v.id, v.score)
  }

  for (const t of textMatches) {
    const prev = map.get(t.id) ?? 0
    // Text can boost but never demote a strong visual match
    if (prev >= 90) {
      map.set(t.id, prev)
    } else {
      map.set(t.id, Math.max(prev, Math.round(prev * 0.35 + t.score * 0.65)))
    }
  }

  return Array.from(map.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

async function textEmbeddingMatches(
  apiKey: string,
  analysis: ImageAnalysis
): Promise<ScoredMatch[]> {
  const cache = await ensureTextEmbeddings(apiKey)
  if (!cache || cache.vectors.size === 0) return []

  const queryVecs = await embedBatch(apiKey, [analysisQueryText(analysis)], 'RETRIEVAL_QUERY')
  const query = queryVecs[0]
  if (!query?.length) return []

  const scored: { id: string; cosine: number }[] = []
  for (const [id, vec] of cache.vectors) {
    scored.push({ id, cosine: cosineSimilarity(query, vec) })
  }
  scored.sort((a, b) => b.cosine - a.cosine)

  const top = scored.slice(0, 12)
  if (!top.length) return []
  const max = top[0].cosine
  const min = top[top.length - 1].cosine
  const span = Math.max(0.0001, max - min)

  return top.map((p, index) => {
    const relative = (p.cosine - min) / span
    const score = Math.round(Math.min(92, Math.max(40, 50 + relative * 38 - index * 1.5)))
    return { id: p.id, score }
  })
}

/**
 * Primary: visual vector/hash over ALL indexed product images (DB).
 * Secondary: text embeddings from Gemini analysis (optional; skipped on 429).
 */
export async function searchProductsByImageEmbeddings(
  apiKey: string | null,
  imageBase64: string,
  mimeType: string,
  lang: 'ar' | 'en'
): Promise<{
  matches: ScoredMatch[]
  analysis: ImageAnalysis | null
  softMatch: boolean
  mode: string
} | null> {
  // Always warm visual index first (independent of Gemini quota)
  await ensureProductImageIndex({ limit: 80 })

  const visual = await searchByVisualFeatures(imageBase64, mimeType)

  let analysis: ImageAnalysis | null = null
  let textMatches: ScoredMatch[] = []
  let mode = visual.length ? 'visual-embedding' : 'local'

  const key = apiKey || getGeminiApiKey()
  if (key) {
    try {
      analysis = await analyzeImageStructured(key, imageBase64, mimeType, lang)
      if (analysis) {
        textMatches = await textEmbeddingMatches(key, analysis)
        if (textMatches.length && visual.length) mode = 'hybrid-visual-text'
        else if (textMatches.length) mode = 'text-embedding'
      }
    } catch (err) {
      console.error('[ai] image search gemini branch', err instanceof Error ? err.message : err)
      // Continue with visual-only results
    }
  }

  const merged = mergeScores(visual, textMatches)
  if (!merged.length) {
    return analysis
      ? { matches: [], analysis, softMatch: true, mode }
      : null
  }

  // Exact/near-exact gallery hit: keep top score high and first
  if (visual[0] && visual[0].hamming <= 6) {
    const exactId = visual[0].id
    const rest = merged.filter((m) => m.id !== exactId)
    const exactScore = Math.max(merged.find((m) => m.id === exactId)?.score ?? 0, visual[0].score, 96)
    const matches = [{ id: exactId, score: Math.min(99, exactScore) }, ...rest].slice(0, 12)
    return {
      matches,
      analysis,
      softMatch: false,
      mode: mode.includes('hybrid') ? 'hybrid-exact' : 'visual-exact',
    }
  }

  const matches = merged.slice(0, 12)
  const softMatch = !matches.length || matches[0].score < STRONG_MATCH_THRESHOLD

  return {
    matches: softMatch ? matches.slice(0, 10) : matches.filter((m) => m.score >= 42),
    analysis,
    softMatch,
    mode,
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
