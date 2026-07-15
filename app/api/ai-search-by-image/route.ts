import { NextRequest, NextResponse } from 'next/server'
import {
  callGemini,
  callOpenAiVision,
  extractProductIds,
  getAiRuntime,
  parseImagePayload,
} from '@server/aiCore'
import {
  analyzeImageStructured,
  loadCatalogForLocal,
  localTagRank,
  searchProductsByImageEmbeddings,
  type ImageAnalysis,
  type ScoredMatch,
} from '@server/vectorSearch'

export const maxDuration = 60
export const runtime = 'nodejs'

function analysisToNote(analysis: ImageAnalysis | null, lang: 'ar' | 'en') {
  if (!analysis) return undefined
  const parts = [
    analysis.workType,
    analysis.materials.slice(0, 3).join(lang === 'ar' ? '، ' : ', '),
    analysis.design,
  ].filter(Boolean)
  return parts.join(lang === 'ar' ? ' · ' : ' · ') || analysis.summary || undefined
}

async function visionFallback(
  imageBase64: string,
  mimeType: string,
  replyLang: 'ar' | 'en'
): Promise<{ matches: ScoredMatch[]; analysis: ImageAnalysis | null; mode: string }> {
  const runtime = await getAiRuntime(replyLang)
  const analysis = process.env.GEMINI_API_KEY
    ? await analyzeImageStructured(process.env.GEMINI_API_KEY, imageBase64, mimeType, replyLang)
    : null

  if (!runtime.ok) {
    const products = await loadCatalogForLocal()
    if (analysis) {
      const matches = localTagRank(analysis, products)
      return { matches, analysis, mode: 'local-tags' }
    }
    return { matches: [], analysis, mode: 'local' }
  }

  const validIds = new Set(runtime.productIds)
  const searchPrompt =
    replyLang === 'ar'
      ? `طابق الصورة مع الكتالوج. أعد JSON array من ids فقط مرتبة من الأكثر تشابهاً.\n${runtime.context}`
      : `Match image to catalog. Return ONLY a JSON array of ids ordered by similarity.\n${runtime.context}`

  const geminiKey = process.env.GEMINI_API_KEY
  const openAiKey = process.env.OPENAI_API_KEY
  let productIds: string[] = []
  let mode = 'local'

  if (geminiKey) {
    const reply = await callGemini(geminiKey, searchPrompt, [], [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: replyLang === 'ar' ? 'أقرب الأعمال؟' : 'Closest works?' },
    ])
    if (reply) {
      productIds = extractProductIds(reply, validIds)
      mode = 'gemini-vision'
    }
  }

  if (productIds.length === 0 && openAiKey) {
    const reply = await callOpenAiVision(
      openAiKey,
      searchPrompt,
      replyLang === 'ar' ? 'أقرب الأعمال؟' : 'Closest works?',
      imageBase64,
      mimeType
    )
    if (reply) {
      productIds = extractProductIds(reply, validIds)
      mode = 'openai-vision'
    }
  }

  const matches = productIds.map((id, i) => ({
    id,
    score: Math.max(70, 98 - i * 4),
  }))

  if (matches.length === 0 && analysis) {
    const products = await loadCatalogForLocal()
    return { matches: localTagRank(analysis, products), analysis, mode: 'local-tags' }
  }

  return { matches, analysis, mode }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      lang?: string
      imageBase64?: string
      mimeType?: string
    }
    const replyLang = body.lang === 'en' ? 'en' : 'ar'
    const image = parseImagePayload(body)

    if (!image) {
      return NextResponse.json({ ok: false, error: 'الصورة مطلوبة' }, { status: 400 })
    }

    const runtime = await getAiRuntime(replyLang)
    if (!runtime.ok) {
      return NextResponse.json({ ok: false, error: runtime.error }, { status: 403 })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    let matches: ScoredMatch[] = []
    let analysis: ImageAnalysis | null = null
    let softMatch = true
    let mode = 'local'

    if (geminiKey) {
      const embedded = await searchProductsByImageEmbeddings(
        geminiKey,
        image.imageBase64,
        image.mimeType,
        replyLang
      )
      if (embedded?.matches.length) {
        matches = embedded.matches
        analysis = embedded.analysis
        softMatch = embedded.softMatch
        mode = embedded.mode
      }
    }

    if (matches.length === 0) {
      const fallback = await visionFallback(image.imageBase64, image.mimeType, replyLang)
      matches = fallback.matches
      analysis = fallback.analysis ?? analysis
      softMatch = matches.length === 0 || (matches[0]?.score ?? 0) < 58
      mode = fallback.mode
    }

    return NextResponse.json({
      ok: true,
      productIds: matches.map((m) => m.id),
      matches,
      analysis,
      softMatch,
      analysisNote: analysisToNote(analysis, replyLang),
      mode,
    })
  } catch (error) {
    console.error('ai-search-by-image', error)
    return NextResponse.json({
      ok: true,
      productIds: [],
      matches: [],
      softMatch: true,
      mode: 'local',
    })
  }
}
