import {
  searchByVisualFeatures,
  SEARCH_TOP_K,
  type SearchStageTimings,
  type VisualMatch,
} from './imageIndex'

const STRONG_MATCH_THRESHOLD = 78

export interface ScoredMatch {
  id: string
  score: number
}

/**
 * DB-only visual search (pgvector / local cosine).
 * No Gemini, OpenAI, or any external AI on this path.
 */
export async function searchProductsByImageEmbeddings(
  _apiKey: string | null,
  imageBase64: string,
  mimeType: string,
  _lang: 'ar' | 'en'
): Promise<{
  matches: ScoredMatch[]
  analysis: null
  softMatch: boolean
  mode: string
  timings: SearchStageTimings
} | null> {
  void _apiKey
  void _lang

  const { matches: visual, timings } = await searchByVisualFeatures(imageBase64, mimeType)
  if (!visual.length) {
    return { matches: [], analysis: null, softMatch: true, mode: 'db-empty', timings }
  }

  const matches: ScoredMatch[] = visual.slice(0, SEARCH_TOP_K).map((m: VisualMatch) => ({
    id: m.id,
    score: m.score,
  }))

  const exact = visual[0] && visual[0].hamming <= 6
  const softMatch = !exact && matches[0].score < STRONG_MATCH_THRESHOLD

  return {
    matches: softMatch ? matches.filter((m) => m.score >= 40) : matches,
    analysis: null,
    softMatch,
    mode: exact ? 'db-exact' : `db-visual:${timings.path}`,
    timings,
  }
}
