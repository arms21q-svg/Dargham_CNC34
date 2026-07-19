import { NextRequest, NextResponse } from 'next/server'
import { parseImagePayload } from '@server/aiCore'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { searchProductsByImageEmbeddings } from '@server/vectorSearch'

export const maxDuration = 10
export const runtime = 'nodejs'

/**
 * Fast image search against Product.imageHash / imageVector in Postgres only.
 * Never calls Gemini, OpenAI, or any vision model. Never returns analysis/workType.
 */
export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const limited = rateLimit(`ai-search:${clientIp(req)}`, 60, 60_000)
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

    // Keep payload small for cold starts (~480px JPEG from client)
    if (image.imageBase64.length > 2_000_000) {
      return NextResponse.json({ ok: false, error: 'الصورة كبيرة جداً' }, { status: 413 })
    }

    const embedded = await searchProductsByImageEmbeddings(
      null,
      image.imageBase64,
      image.mimeType,
      replyLang
    )

    const matches = embedded?.matches ?? []
    const softMatch = embedded?.softMatch ?? true
    const mode = embedded?.mode ?? 'db-empty'
    const ms = Date.now() - started

    return NextResponse.json(
      {
        ok: true,
        productIds: matches.map((m) => m.id),
        matches,
        softMatch,
        mode,
        ms,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
          'X-Image-Search-Mode': mode,
          'X-Image-Search-Ms': String(ms),
        },
      }
    )
  } catch (error) {
    console.error('[image-search]', error instanceof Error ? error.message : error)
    return NextResponse.json({
      ok: true,
      productIds: [],
      matches: [],
      softMatch: true,
      mode: 'error',
      ms: Date.now() - started,
    })
  }
}
