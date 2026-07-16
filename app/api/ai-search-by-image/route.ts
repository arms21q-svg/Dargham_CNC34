import { NextRequest, NextResponse } from 'next/server'
import {
  callGemini,
  callOpenAiVision,
  extractProductIds,
  getAiRuntime,
  parseImagePayload,
} from '@server/aiCore'
import { getGeminiApiKey } from '@server/geminiClient'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { scheduleProductImageReindex } from '@server/imageIndex'
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
  return parts.join(' · ') || analysis.summary || undefined
}

/** Vision match against FULL catalog ids (not the chat-limited 8). */
async function visionFallback(
  imageBase64: string,
  mimeType: string,
  replyLang: 'ar' | 'en',
  existingAnalysis: ImageAnalysis | null
): Promise<{ matches: ScoredMatch[]; analysis: ImageAnalysis | null; mode: string }> {
  const products = await loadCatalogForLocal()
  const validIds = new Set(products.map((p) => p.id))
  const catalogLines = products
    .slice(0, 40)
    .map((p) => {
      const title = replyLang === 'ar' ? p.titleAr : p.titleEn
      return `${p.id}:${title} (${p.category})`
    })
    .join('\n')

  const geminiKey = getGeminiApiKey()
  let analysis = existingAnalysis

  if (!analysis && geminiKey) {
    analysis = await analyzeImageStructured(geminiKey, imageBase64, mimeType, replyLang)
  }

  const searchPrompt =
    replyLang === 'ar'
      ? `طابق الصورة مع كتالوج الأعمال. أعد JSON array من ids مرتبة من الأكثر تشابهاً فقط.\nCatalog:\n${catalogLines}`
      : `Match the image to the works catalog. Return ONLY a JSON array of ids ordered by similarity.\nCatalog:\n${catalogLines}`

  const openAiKey = process.env.OPENAI_API_KEY
  let productIds: string[] = []
  let mode = 'local'

  if (geminiKey) {
    const result = await callGemini(geminiKey, searchPrompt, [], [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: replyLang === 'ar' ? 'أقرب الأعمال؟' : 'Closest works?' },
    ])
    if (result.ok && result.text) {
      productIds = extractProductIds(result.text, validIds)
      mode = 'gemini-vision'
    } else if (result.kind === 'quota') {
      console.error('[ai] vision fallback quota 429 — using tags/local')
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
    return { matches: localTagRank(analysis, products), analysis, mode: 'local-tags' }
  }

  return { matches, analysis, mode }
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`ai-search:${clientIp(req)}`, 20, 60_000)
    if (!limited.ok) return rateLimitResponse(limited.retryAfter)

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

    if (image.imageBase64.length > 5_500_000) {
      return NextResponse.json({ ok: false, error: 'الصورة كبيرة جداً' }, { status: 413 })
    }

    const runtime = await getAiRuntime(replyLang)
    if (!runtime.ok) {
      return NextResponse.json({ ok: false, error: runtime.error }, { status: 403 })
    }

    // Kick background indexing for any new products
    scheduleProductImageReindex()

    const geminiKey = getGeminiApiKey()
    let matches: ScoredMatch[] = []
    let analysis: ImageAnalysis | null = null
    let softMatch = true
    let mode = 'local'

    // Visual DB index first — works even when Gemini returns 429
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
    } else if (embedded?.analysis) {
      analysis = embedded.analysis
    }

    // Only call vision if visual search found nothing useful
    if (!matches.length || (matches[0].score < 55 && geminiKey)) {
      try {
        const fallback = await visionFallback(
          image.imageBase64,
          image.mimeType,
          replyLang,
          analysis
        )
        if (fallback.matches.length) {
          // Merge: keep higher visual scores, append vision-only ids
          const byId = new Map(matches.map((m) => [m.id, m.score]))
          for (const m of fallback.matches) {
            const prev = byId.get(m.id) ?? 0
            byId.set(m.id, Math.max(prev, m.score))
          }
          matches = Array.from(byId.entries())
            .map(([id, score]) => ({ id, score }))
            .sort((a, b) => b.score - a.score)
          analysis = fallback.analysis ?? analysis
          softMatch = matches[0].score < 78
          mode = matches[0].score >= 90 ? mode : `${mode}+${fallback.mode}`
        }
      } catch (err) {
        console.error('[ai] vision fallback', err instanceof Error ? err.message : err)
      }
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
    console.error('[ai] search-by-image', error instanceof Error ? error.message : error)
    return NextResponse.json({
      ok: true,
      productIds: [],
      matches: [],
      softMatch: true,
      mode: 'local',
    })
  }
}
