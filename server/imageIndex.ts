import sharp from 'sharp'
import { prisma } from './db'

export const VECTOR_SIZE = 12
export const VECTOR_DIM = VECTOR_SIZE * VECTOR_SIZE * 3 // 432
export const SEARCH_TOP_K = 20

export type VisualFeatures = {
  hash: string
  vector: number[]
}

export type VisualMatch = {
  id: string
  score: number
  cosine: number
  hamming: number
}

type CatalogEntry = {
  id: string
  hash: string | null
  vector: number[]
}

type CatalogCache = {
  at: number
  fingerprint: string
  entries: CatalogEntry[]
}

type SearchCacheEntry = {
  at: number
  matches: VisualMatch[]
}

const CATALOG_TTL_MS = 180_000
const SEARCH_TTL_MS = 180_000
const SEARCH_CACHE_MAX = 128
const SLOW_STAGE_MS = 500

let catalogCache: CatalogCache | null = null
const searchCache = new Map<string, SearchCacheEntry>()
/** null = unknown; never run DDL on the search path */
let pgvectorReady: boolean | null = null
let pgvectorEnsurePromise: Promise<boolean> | null = null
let pgvectorProbePromise: Promise<boolean> | null = null

export type SearchStageTimings = {
  featuresMs: number
  cacheMs: number
  dbMs: number
  rankMs: number
  totalMs: number
  path: 'cache' | 'pgvector' | 'memory' | 'empty'
}

function logSlowStage(stage: string, ms: number, extra?: Record<string, unknown>) {
  if (ms < SLOW_STAGE_MS) return
  console.warn('[image-search:slow]', JSON.stringify({ stage, ms, ...extra }))
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

function toVectorLiteral(vector: number[]): string {
  if (!Array.isArray(vector) || vector.length !== VECTOR_DIM) {
    throw new Error('invalid vector dim')
  }
  return `[${vector.map((v) => (Number.isFinite(v) ? Number(v).toFixed(6) : '0')).join(',')}]`
}

function scoreFromSignals(cosine: number, hamming: number): number {
  const hashScore =
    hamming <= 12 ? Math.max(70, Math.round(99 - hamming * 1.4)) : Math.max(0, 70 - (hamming - 12) * 3)
  const vectorScore = Math.max(0, Math.min(99, Math.round(((cosine - 0.55) / 0.45) * 99)))

  let score: number
  if (hamming <= 6) {
    score = Math.max(hashScore, vectorScore, 94)
  } else if (hamming <= 12 || cosine >= 0.92) {
    score = Math.round(Math.max(hashScore, vectorScore) * 0.55 + Math.min(hashScore, vectorScore) * 0.45)
    score = Math.max(score, Math.round((hashScore + vectorScore) / 2))
  } else {
    score = Math.round(vectorScore * 0.75 + hashScore * 0.25)
  }
  return Math.max(0, Math.min(99, score))
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
  _mimeType?: string
): Promise<VisualFeatures | null> {
  void _mimeType
  try {
    return await featuresFromBuffer(Buffer.from(imageBase64, 'base64'))
  } catch (err) {
    console.warn('[image-index] featuresFromBase64', err instanceof Error ? err.message : err)
    return null
  }
}

export async function featuresFromBuffer(input: Buffer): Promise<VisualFeatures | null> {
  try {
    // One decode → tiny RGB grid; derive aHash from luminance of same pixels (fast)
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

    let norm = 0
    for (let i = 0; i < vector.length; i++) norm += vector[i] * vector[i]
    norm = Math.sqrt(norm) || 1
    for (let i = 0; i < vector.length; i++) vector[i] /= norm

    // 8×8 aHash from subsampled luminance of the 12×12 grid
    const gray8 = new Array<number>(64)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sx = Math.min(VECTOR_SIZE - 1, Math.round((x / 7) * (VECTOR_SIZE - 1)))
        const sy = Math.min(VECTOR_SIZE - 1, Math.round((y / 7) * (VECTOR_SIZE - 1)))
        const i = (sy * VECTOR_SIZE + sx) * 3
        gray8[y * 8 + x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      }
    }
    let sum = 0
    for (let i = 0; i < 64; i++) sum += gray8[i]
    const mean = sum / 64
    let bits = ''
    for (let i = 0; i < 64; i++) bits += gray8[i] >= mean ? '1' : '0'
    let hash = ''
    for (let i = 0; i < 64; i += 4) {
      hash += parseInt(bits.slice(i, i + 4), 2).toString(16)
    }

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

/** Admin/publish only — never call from search. */
export async function ensurePgvectorSchema(): Promise<boolean> {
  if (pgvectorReady != null) return pgvectorReady
  if (pgvectorEnsurePromise) return pgvectorEnsurePromise

  pgvectorEnsurePromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector`)
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS embedding vector(${VECTOR_DIM})`
      )
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS product_embedding_hnsw ON "Product" USING hnsw (embedding vector_cosine_ops)`
      )
      pgvectorReady = true
      console.info('[image-index] pgvector ready (HNSW)')
      return true
    } catch (err) {
      pgvectorReady = false
      console.warn(
        '[image-index] pgvector unavailable — using Product.imageVector',
        err instanceof Error ? err.message : err
      )
      return false
    } finally {
      pgvectorEnsurePromise = null
    }
  })()

  return pgvectorEnsurePromise
}

async function persistEmbedding(productId: string, vector: number[]): Promise<void> {
  const ready = await ensurePgvectorSchema()
  if (!ready) return
  try {
    const literal = toVectorLiteral(vector)
    await prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
      literal,
      productId
    )
  } catch (err) {
    console.warn('[image-index] embedding write', productId, err instanceof Error ? err.message : err)
  }
}

export function invalidateVisualIndexCache() {
  catalogCache = null
  searchCache.clear()
}

/** Cheap readiness probe — no DDL on the search path. */
async function probePgvectorReady(): Promise<boolean> {
  if (pgvectorReady != null) return pgvectorReady
  if (pgvectorProbePromise) return pgvectorProbePromise

  pgvectorProbePromise = (async () => {
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "Product" WHERE embedding IS NOT NULL LIMIT 1`)
      pgvectorReady = true
      return true
    } catch {
      pgvectorReady = false
      return false
    } finally {
      pgvectorProbePromise = null
    }
  })()

  return pgvectorProbePromise
}

async function catalogFingerprint(): Promise<string> {
  const agg = await prisma.product.aggregate({
    _count: { id: true },
    _max: { updatedAt: true },
  })
  return `${agg._count.id}:${agg._max.updatedAt?.getTime() ?? 0}`
}

async function loadCatalogEntries(force = false): Promise<CatalogEntry[]> {
  // Serve hot cache without touching the DB (biggest search win)
  if (!force && catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) {
    return catalogCache.entries
  }

  const fpStarted = Date.now()
  const fingerprint = await catalogFingerprint()
  logSlowStage('catalogFingerprint', Date.now() - fpStarted)

  if (!force && catalogCache && catalogCache.fingerprint === fingerprint) {
    catalogCache = { ...catalogCache, at: Date.now() }
    return catalogCache.entries
  }

  const loadStarted = Date.now()
  const products = await prisma.product.findMany({
    where: { published: true },
    select: {
      id: true,
      imageHash: true,
      imageVector: true,
    },
  })
  logSlowStage('catalogFullLoad', Date.now() - loadStarted, { rows: products.length })

  const entries: CatalogEntry[] = []
  for (const p of products) {
    const vector = Array.isArray(p.imageVector) ? (p.imageVector as number[]) : null
    if (!vector || vector.length !== VECTOR_DIM) continue
    entries.push({ id: p.id, hash: p.imageHash, vector })
  }

  catalogCache = { at: Date.now(), fingerprint, entries }
  return entries
}

/** Primary fast path — HNSW cosine ANN when embeddings exist. */
async function searchWithPgvector(query: VisualFeatures): Promise<VisualMatch[] | null> {
  const ready = await probePgvectorReady()
  if (!ready) return null

  try {
    const literal = toVectorLiteral(query.vector)
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; cosine: number; imageHash: string | null }>
    >(
      `
      SELECT
        id,
        "imageHash" as "imageHash",
        GREATEST(0, LEAST(1, 1 - (embedding <=> $1::vector)))::float8 AS cosine
      FROM "Product"
      WHERE embedding IS NOT NULL AND published = true
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      literal,
      SEARCH_TOP_K
    )

    return rows.map((row) => {
      const cosine = Number(row.cosine) || 0
      const hamming = row.imageHash ? hammingDistanceHex(query.hash, row.imageHash) : 64
      return {
        id: row.id,
        cosine,
        hamming,
        score: scoreFromSignals(cosine, hamming),
      }
    })
  } catch (err) {
    console.warn('[image-index] pgvector search failed', err instanceof Error ? err.message : err)
    pgvectorReady = false
    return null
  }
}

function searchInMemory(query: VisualFeatures, entries: CatalogEntry[]): VisualMatch[] {
  const scored: VisualMatch[] = []
  for (const p of entries) {
    const cosine = cosineSimilarity(query.vector, p.vector)
    const hamming = p.hash ? hammingDistanceHex(query.hash, p.hash) : 64
    const score = scoreFromSignals(cosine, hamming)
    if (score < 35) continue
    scored.push({ id: p.id, score, cosine, hamming })
  }
  scored.sort((a, b) => b.score - a.score || a.hamming - b.hamming)
  return scored.slice(0, SEARCH_TOP_K)
}

/**
 * Rank catalog images against the query using stored DB vectors only.
 * No Gemini / vision / DDL on this path.
 * Prefer pgvector ANN → in-memory cosine over cached Product.imageVector.
 */
export async function searchByVisualFeatures(
  queryBase64: string,
  mimeType: string
): Promise<{ matches: VisualMatch[]; timings: SearchStageTimings }> {
  const totalStarted = Date.now()
  const timings: SearchStageTimings = {
    featuresMs: 0,
    cacheMs: 0,
    dbMs: 0,
    rankMs: 0,
    totalMs: 0,
    path: 'empty',
  }

  const featStarted = Date.now()
  const query = await featuresFromBase64(queryBase64, mimeType)
  timings.featuresMs = Date.now() - featStarted
  logSlowStage('features', timings.featuresMs)
  if (!query) {
    timings.totalMs = Date.now() - totalStarted
    return { matches: [], timings }
  }

  const cacheStarted = Date.now()
  const cacheKey = query.hash
  const cached = searchCache.get(cacheKey)
  timings.cacheMs = Date.now() - cacheStarted
  if (cached && Date.now() - cached.at < SEARCH_TTL_MS) {
    timings.path = 'cache'
    timings.totalMs = Date.now() - totalStarted
    return { matches: cached.matches, timings }
  }

  // 1) pgvector HNSW first (scales to 100k+)
  const dbStarted = Date.now()
  const pg = await searchWithPgvector(query)
  timings.dbMs = Date.now() - dbStarted
  logSlowStage('pgvector', timings.dbMs)

  let matches: VisualMatch[] = []
  if (pg?.length) {
    const rankStarted = Date.now()
    matches = pg
      .filter((m) => m.score >= 35)
      .sort((a, b) => b.score - a.score || a.hamming - b.hamming)
      .slice(0, SEARCH_TOP_K)
    timings.rankMs = Date.now() - rankStarted
    timings.path = 'pgvector'
  } else {
    // 2) Fallback: cached JSON vectors (no full scan when TTL warm)
    const memStarted = Date.now()
    const entries = await loadCatalogEntries()
    timings.dbMs += Date.now() - memStarted
    logSlowStage('memoryCatalog', Date.now() - memStarted, { entries: entries.length })

    const rankStarted = Date.now()
    matches = searchInMemory(query, entries)
    timings.rankMs = Date.now() - rankStarted
    timings.path = matches.length ? 'memory' : 'empty'
  }

  if (searchCache.size >= SEARCH_CACHE_MAX) {
    const oldest = searchCache.keys().next().value
    if (oldest) searchCache.delete(oldest)
  }
  searchCache.set(cacheKey, { at: Date.now(), matches })

  timings.totalMs = Date.now() - totalStarted
  logSlowStage('totalSearch', timings.totalMs, { path: timings.path })
  return { matches, timings }
}

/** Index products missing vectors (publish / admin only — not on search). */
export async function ensureProductImageIndex(options?: {
  forceIds?: string[]
  limit?: number
}): Promise<{ indexed: number; failed: number }> {
  await ensurePgvectorSchema()

  const limit = options?.limit ?? 80
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

  const needs = products
    .filter((p) => {
      if (options?.forceIds?.includes(p.id)) return true
      if (!p.image) return false
      if (!p.imageHash || !p.imageVector || !p.indexedAt) return true
      return p.updatedAt.getTime() > p.indexedAt.getTime()
    })
    .slice(0, limit)

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
      await persistEmbedding(p.id, feats.vector)
      indexed += 1
    } catch (err) {
      failed += 1
      console.warn('[image-index] product', p.id, err instanceof Error ? err.message : err)
    }
  }

  if (indexed || failed) {
    invalidateVisualIndexCache()
    console.info('[image-index]', JSON.stringify({ indexed, failed, pending: needs.length }))
  }

  return { indexed, failed }
}

/** Fire-and-forget reindex after admin publishes products. */
export function scheduleProductImageReindex(forceIds?: string[]) {
  invalidateVisualIndexCache()
  void ensureProductImageIndex({ forceIds, limit: 120 }).catch((err) => {
    console.warn('[image-index] schedule failed', err instanceof Error ? err.message : err)
  })
}
