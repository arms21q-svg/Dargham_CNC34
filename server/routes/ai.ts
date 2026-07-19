import { Router } from 'express'
import {
  buildSiteContext,
  buildSystemPrompt,
  callGemini,
  callOpenAiVision,
  ensureAiEnabled,
  handleAiChat,
  localImageAnalysis,
  parseImagePayload,
  type ChatMessage,
} from '../aiCore'
import { searchProductsByImageEmbeddings } from '../vectorSearch'

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
      const result = await callGemini(geminiKey, systemPrompt, [], [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: prompt },
      ])
      if (result.ok && result.text) {
        res.json({ ok: true, reply: result.text, mode: 'gemini-vision' })
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

/** DB-only visual search — no Gemini, no analysis/workType. */
router.post('/search-by-image', async (req, res) => {
  const started = Date.now()
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
    const embedded = await searchProductsByImageEmbeddings(
      null,
      image.imageBase64,
      image.mimeType,
      replyLang
    )
    const matches = embedded?.matches ?? []
    res.json({
      ok: true,
      productIds: matches.map((m) => m.id),
      matches,
      softMatch: embedded?.softMatch ?? true,
      mode: embedded?.mode ?? 'db-empty',
      ms: Date.now() - started,
    })
  } catch (error) {
    console.error('Search by image error:', error)
    res.json({
      ok: true,
      productIds: [],
      matches: [],
      softMatch: true,
      mode: 'error',
      ms: Date.now() - started,
    })
  }
})

export { router as aiRouter }
