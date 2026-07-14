import { NextRequest, NextResponse } from 'next/server'
import {
  buildSiteContext,
  callGemini,
  callOpenAiVision,
  ensureAiEnabled,
  extractProductIds,
  parseImagePayload,
} from '@server/aiCore'

export const maxDuration = 60
export const runtime = 'nodejs'

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

    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      return NextResponse.json({ ok: false, error: gate.error }, { status: 403 })
    }

    const { context, products } = await buildSiteContext(replyLang)
    const validIds = new Set(products.map((p) => p.id))

    const searchPrompt =
      replyLang === 'ar'
        ? `أنت نظام مطابقة صور. قارن الصورة مع الأعمال أدناه. أعد فقط JSON array من ids.
${context}`
        : `Compare the image with works below. Return ONLY a JSON array of ids.
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

    return NextResponse.json({ ok: true, productIds, analysis, mode })
  } catch (error) {
    console.error('ai-search-by-image', error)
    return NextResponse.json({ ok: true, productIds: [], mode: 'local' })
  }
}
