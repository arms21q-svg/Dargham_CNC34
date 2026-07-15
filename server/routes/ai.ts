import { Router } from 'express'
import {
  buildSiteContext,
  buildSystemPrompt,
  callGemini,
  callOpenAiVision,
  ensureAiEnabled,
  extractProductIds,
  handleAiChat,
  localImageAnalysis,
  parseImagePayload,
  type ChatMessage,
} from '../aiCore'
import {
  analyzeImageStructured,
  loadCatalogForLocal,
  localTagRank,
  searchProductsByImageEmbeddings,
  type ImageAnalysis,
  type ScoredMatch,
} from '../vectorSearch'

const router = Router()

router.post('/chat', async (req, res) => {
  const body = req.body as {
    message?: string
    lang?: 'ar' | 'en'
    history?: ChatMessage[]
    imageBase64?: string
    mimeType?: string
  }
  const result = await handleAiChat(body)
  res.status(result.status).json(result.body)
})

router.post('/analyze-image', async (req, res) => {
  const { lang = 'ar', message, imageBase64, mimeType } = req.body as {
    lang?: 'ar' | 'en'
    message?: string
    imageBase64?: string
    mimeType?: string
  }

  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })

  if (!image) {
    res.status(400).json({ ok: false, error: 'الصورة مطلوبة' })
    return
  }

  try {
    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      res.status(403).json({ ok: false, error: gate.error })
      return
    }

    const prompt =
      message?.trim() ||
      (replyLang === 'ar'
        ? 'حلّل هذه الصورة: نوع التصميم، الألوان، الخامة المحتملة، وهل يمكن تنفيذها بتقنية CNC؟'
        : 'Analyze this image: design type, colors, likely material, and CNC feasibility.')

    const { context, whatsapp } = await buildSiteContext(replyLang)
    const systemPrompt = buildSystemPrompt(replyLang, context, true)
    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY

    if (geminiKey) {
      const reply = await callGemini(geminiKey, systemPrompt, [], [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: prompt },
      ])
      if (reply) {
        res.json({ ok: true, reply, mode: 'gemini-vision' })
        return
      }
    }

    if (openAiKey) {
      const reply = await callOpenAiVision(
        openAiKey,
        systemPrompt,
        prompt,
        image.imageBase64,
        image.mimeType
      )
      if (reply) {
        res.json({ ok: true, reply, mode: 'openai-vision' })
        return
      }
    }

    res.json({
      ok: true,
      reply: localImageAnalysis(replyLang, whatsapp || gate.whatsapp),
      mode: 'local-image',
    })
  } catch (error) {
    console.error('Analyze image error:', error)
    res.json({
      ok: true,
      reply: localImageAnalysis(replyLang, '9647701234567'),
      mode: 'local-image',
    })
  }
})

function analysisToNote(analysis: ImageAnalysis | null, lang: 'ar' | 'en') {
  if (!analysis) return undefined
  const parts = [
    analysis.workType,
    analysis.materials.slice(0, 3).join(lang === 'ar' ? '، ' : ', '),
    analysis.design,
  ].filter(Boolean)
  return parts.join(' · ') || analysis.summary || undefined
}

router.post('/search-by-image', async (req, res) => {
  const { lang = 'ar', imageBase64, mimeType } = req.body as {
    lang?: 'ar' | 'en'
    imageBase64?: string
    mimeType?: string
  }

  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })

  if (!image) {
    res.status(400).json({ ok: false, error: 'الصورة مطلوبة' })
    return
  }

  try {
    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      res.status(403).json({ ok: false, error: gate.error })
      return
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
      const { context, products } = await buildSiteContext(replyLang)
      const validIds = new Set(products.map((p) => p.id))
      const searchPrompt =
        replyLang === 'ar'
          ? `طابق الصورة مع الكتالوج. أعد JSON array من ids فقط.\n${context}`
          : `Match image to catalog. Return ONLY a JSON array of ids.\n${context}`

      analysis =
        analysis ||
        (geminiKey
          ? await analyzeImageStructured(geminiKey, image.imageBase64, image.mimeType, replyLang)
          : null)

      const openAiKey = process.env.OPENAI_API_KEY
      let productIds: string[] = []

      if (geminiKey) {
        const reply = await callGemini(geminiKey, searchPrompt, [], [
          { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
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
          image.imageBase64,
          image.mimeType
        )
        if (reply) {
          productIds = extractProductIds(reply, validIds)
          mode = 'openai-vision'
        }
      }

      matches = productIds.map((id, i) => ({ id, score: Math.max(70, 98 - i * 4) }))

      if (matches.length === 0 && analysis) {
        matches = localTagRank(analysis, await loadCatalogForLocal())
        mode = 'local-tags'
      }
      softMatch = matches.length === 0 || (matches[0]?.score ?? 0) < 58
    }

    res.json({
      ok: true,
      productIds: matches.map((m) => m.id),
      matches,
      analysis,
      softMatch,
      analysisNote: analysisToNote(analysis, replyLang),
      mode,
    })
  } catch (error) {
    console.error('Search by image error:', error)
    res.json({ ok: true, productIds: [], matches: [], softMatch: true, mode: 'local' })
  }
})

export { router as aiRouter }
