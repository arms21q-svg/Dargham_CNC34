import { NextRequest, NextResponse } from 'next/server'
import { parseImagePayload } from '@server/aiCore'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'
import { searchProductsByImageEmbeddings } from '@server/vectorSearch'

export const maxDuration = 10
export const runtime = 'nodejs'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'])
/** ~750KB base64 ≈ ~560KB binary — search payloads stay tiny after client compress */
const MAX_BASE64_CHARS = 1_000_000

/**
 * Fast image search against Product.imageHash / imageVector / pgvector only.
 * Never calls Gemini, OpenAI, or any vision model. Never returns analysis/workType.
 */
export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const limited = rateLimit(`ai-search:${clientIp(req)}`, 30, 60_000)
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

    const mime = image.mimeType.toLowerCase()
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ ok: false, error: 'نوع الصورة غير مدعوم' }, { status: 415 })
    }

    if (image.imageBase64.length > MAX_BASE64_CHARS) {
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
    const timings = embedded?.timings
    const ms = Date.now() - started

    if (ms >= 500) {
      console.warn(
        '[image-search:timing]',
        JSON.stringify({
          ms,
          mode,
          matchCount: matches.length,
          featuresMs: timings?.featuresMs,
          dbMs: timings?.dbMs,
          rankMs: timings?.rankMs,
          path: timings?.path,
        })
      )
    }

    return NextResponse.json(
      {
        ok: true,
        productIds: matches.map((m) => m.id),
        matches,
        softMatch,
        mode,
        ms,
        timings,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
          'X-Image-Search-Mode': mode,
          'X-Image-Search-Ms': String(ms),
          'X-Image-Search-Path': timings?.path ?? 'unknown',
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
