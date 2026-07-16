import { NextRequest, NextResponse } from 'next/server'
import {
  handleAiChat,
  prepareAiChatStream,
  type ChatMessage,
} from '@server/aiCore'
import { serviceUnavailableMessage } from '@server/geminiClient'
import { clientIp, rateLimit, rateLimitResponse } from '@server/rateLimit'

export const maxDuration = 60
export const runtime = 'nodejs'

function sseEncode(obj: Record<string, unknown>) {
  return `data: ${JSON.stringify(obj)}\n\n`
}

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`ai-chat:${clientIp(req)}`, 30, 60_000)
    if (!limited.ok) return rateLimitResponse(limited.retryAfter)

    const body = (await req.json().catch(() => ({}))) as {
      message?: string
      lang?: string
      history?: ChatMessage[]
      imageBase64?: string
      mimeType?: string
      stream?: boolean
    }

    const lang = body.lang === 'en' ? 'en' : 'ar'
    const wantStream = body.stream !== false

    if (!wantStream) {
      const result = await handleAiChat({
        message: body.message,
        lang,
        history: body.history ?? [],
        imageBase64: body.imageBase64,
        mimeType: body.mimeType,
      })
      return NextResponse.json(result.body, { status: result.status })
    }

    const prepared = await prepareAiChatStream({
      message: body.message,
      lang,
      history: body.history ?? [],
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
    })

    if (!prepared.ok) {
      return NextResponse.json(
        { ok: false, error: prepared.error },
        { status: prepared.status }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(sseEncode(obj)))
        }

        try {
          if (prepared.cachedReply) {
            send({ ok: true, mode: prepared.mode, cached: true })
            send({ delta: prepared.cachedReply })
            send({ done: true, reply: prepared.cachedReply })
            return
          }

          send({
            ok: true,
            mode: prepared.mode,
            unavailable: prepared.unavailableFallback,
          })

          let full = ''
          let streamMeta: { kind?: string; status?: number; model?: string } = {}

          if (prepared.stream) {
            const gen = prepared.stream
            let next = await gen.next()
            while (!next.done) {
              full += next.value
              send({ delta: next.value })
              next = await gen.next()
            }
            if (next.value) {
              streamMeta = {
                kind: next.value.kind,
                status: next.value.status,
                model: next.value.model,
              }
            }
          }

          if (!full.trim()) {
            full = prepared.fallback || serviceUnavailableMessage(lang)
            send({
              delta: full,
              mode: 'unavailable',
              unavailable: true,
              errorKind: streamMeta.kind || 'unknown',
              errorStatus: streamMeta.status,
              model: streamMeta.model,
            })
          }

          send({ done: true, reply: full, mode: full === prepared.fallback ? 'unavailable' : prepared.mode })
        } catch (error) {
          console.error('[ai] stream handler', error instanceof Error ? error.message : error)
          const msg = serviceUnavailableMessage(lang)
          send({ delta: msg, mode: 'unavailable', unavailable: true })
          send({ done: true, reply: msg })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[ai] chat route', error instanceof Error ? error.message : error)
    return NextResponse.json(
      {
        ok: false,
        error: serviceUnavailableMessage('ar'),
      },
      { status: 503 }
    )
  }
}
