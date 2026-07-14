import { NextRequest, NextResponse } from 'next/server'
import {
  buildSiteContext,
  buildSystemPrompt,
  callGemini,
  callOpenAiVision,
  ensureAiEnabled,
  localImageAnalysis,
  parseImagePayload,
} from '@server/aiCore'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      lang?: string
      message?: string
      imageBase64?: string
      mimeType?: string
    }
    const replyLang = body.lang === 'en' ? 'en' : 'ar'
    const image = parseImagePayload(body)

    if (!image) {
      return NextResponse.json({ ok: false, error: 'الصورة مطلوبة' }, { status: 400 })
    }

    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error }, { status: 403 })
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
        return NextResponse.json({ ok: true, reply, mode: 'gemini-vision' })
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
        return NextResponse.json({ ok: true, reply, mode: 'openai-vision' })
      }
    }

    return NextResponse.json({
      ok: true,
      reply: localImageAnalysis(replyLang, whatsapp || gate.whatsapp),
      mode: 'local-image',
    })
  } catch (error) {
    console.error('ai-analyze-image', error)
    return NextResponse.json({
      ok: true,
      reply: localImageAnalysis('ar', '9647701234567'),
      mode: 'local-image',
    })
  }
}
