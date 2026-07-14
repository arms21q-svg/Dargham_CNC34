import type { VercelRequest, VercelResponse } from '@vercel/node'
import '../../server/loadEnv.js'
import {
  buildSiteContext,
  callGemini,
  callOpenAiVision,
  ensureAiEnabled,
  extractProductIds,
  parseImagePayload,
} from '../../server/aiCore.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const replyLang = body.lang === 'en' ? 'en' : 'ar'
    const image = parseImagePayload(body)

    if (!image) {
      res.status(400).json({ ok: false, error: 'الصورة مطلوبة' })
      return
    }

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

    res.status(200).json({ ok: true, productIds, analysis, mode })
  } catch (error) {
    console.error('search-by-image', error)
    res.status(200).json({ ok: true, productIds: [], mode: 'local' })
  }
}
