import { NextRequest, NextResponse } from 'next/server'
import {
  buildSystemPrompt,
  callGemini,
  callOpenAiVision,
  getAiRuntime,
  localImageAnalysis,
  parseImagePayload,
} from '@server/aiCore'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`ai-analyze:${clientIp(req)}`, 20, 60_000)
    if (!limited.ok) return rateLimitResponse(limited.retryAfter)

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

    const runtime = await getAiRuntime(replyLang)
    if (!runtime.ok) {
      return NextResponse.json({ ok: false, error: runtime.error }, { status: 403 })
    }

    const prompt =
      body.message?.trim() ||
      (replyLang === 'ar'
        ? 'حلّل الصورة للـ CNC: نوع، ألوان، خامة، قابلية التنفيذ.'
        : 'Analyze image for CNC: type, colors, material, feasibility.')

    const systemPrompt = buildSystemPrompt(replyLang, runtime.context, true)
    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY

    // Prefer Gemini; OpenAI only if Gemini missing/fails — no sequential model spam beyond one retry
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
      reply: localImageAnalysis(replyLang, runtime.whatsapp),
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
