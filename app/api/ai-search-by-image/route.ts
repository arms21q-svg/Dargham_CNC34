import { NextRequest, NextResponse } from 'next/server'
import {
  callGemini,
  callOpenAiVision,
  extractProductIds,
  getAiRuntime,
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

    const runtime = await getAiRuntime(replyLang)
    if (!runtime.ok) {
      return NextResponse.json({ ok: false, error: runtime.error }, { status: 403 })
    }

    const validIds = new Set(runtime.productIds)
    const searchPrompt =
      replyLang === 'ar'
        ? `طابق الصورة مع الكتالوج. أعد JSON array من ids فقط.\n${runtime.context}`
        : `Match image to catalog. Return ONLY a JSON array of ids.\n${runtime.context}`

    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY
    let productIds: string[] = []
    let analysis: string | undefined
    let mode = 'local'

    if (geminiKey) {
      const reply = await callGemini(geminiKey, searchPrompt, [], [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: replyLang === 'ar' ? 'أقرب الأعمال؟' : 'Closest works?' },
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
        replyLang === 'ar' ? 'أقرب الأعمال؟' : 'Closest works?',
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
