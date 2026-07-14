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

    const { context, products } = await buildSiteContext(replyLang)
    const validIds = new Set(products.map((p) => p.id))

    const searchPrompt =
      replyLang === 'ar'
        ? `أنت نظام مطابقة صور. قارن الصورة المرفقة مع قائمة الأعمال أدناه.
أعد فقط JSON array بمعرّفات id للأعمال الأكثر تشابهاً (3 إلى 6 ids) بدون أي نص آخر.
مثال: ["id1","id2"]

${context}`
        : `You are an image matching system. Compare the attached image with the works list below.
Return ONLY a JSON array of the most similar work ids (3 to 6 ids), no other text.
Example: ["id1","id2"]

${context}`

    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY
    let productIds: string[] = []
    let analysis: string | undefined
    let mode = 'local'

    if (geminiKey) {
      const reply = await callGemini(geminiKey, searchPrompt, [], [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: replyLang === 'ar' ? 'أوجد أقرب الأعمال.' : 'Find closest works.' },
      ])

      if (reply) {
        productIds = extractProductIds(reply, validIds)
        analysis = reply
        mode = 'gemini-vision'
      }
    }

    if (productIds.length === 0 && openAiKey) {
      const reply = await callOpenAiVision(
        openAiKey,
        searchPrompt,
        replyLang === 'ar' ? 'أوجد أقرب الأعمال.' : 'Find closest works.',
        image.imageBase64,
        image.mimeType
      )

      if (reply) {
        productIds = extractProductIds(reply, validIds)
        analysis = reply
        mode = 'openai-vision'
      }
    }

    res.json({ ok: true, productIds, analysis, mode })
  } catch (error) {
    console.error('Search by image error:', error)
    res.json({ ok: true, productIds: [], mode: 'local' })
  }
})

export { router as aiRouter }
