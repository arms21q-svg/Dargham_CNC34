import type { VercelRequest, VercelResponse } from '@vercel/node'
import '../../server/loadEnv.js'
import {
  buildSiteContext,
  buildSystemPrompt,
  callGemini,
  callOpenAiVision,
  ensureAiEnabled,
  localImageAnalysis,
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

    const prompt =
      body.message?.trim() ||
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
        res.status(200).json({ ok: true, reply, mode: 'gemini-vision' })
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
        res.status(200).json({ ok: true, reply, mode: 'openai-vision' })
        return
      }
    }

    res.status(200).json({
      ok: true,
      reply: localImageAnalysis(replyLang, whatsapp || gate.whatsapp),
      mode: 'local-image',
    })
  } catch (error) {
    console.error('analyze-image', error)
    res.status(200).json({
      ok: true,
      reply: localImageAnalysis('ar', '9647701234567'),
      mode: 'local-image',
    })
  }
}
