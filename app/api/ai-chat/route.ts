import { NextRequest, NextResponse } from 'next/server'
import {
  handleAiChat,
  prepareAiChatStream,
  type ChatMessage,
} from '@server/aiCore'

export const maxDuration = 60
export const runtime = 'nodejs'

function sseEncode(obj: Record<string, unknown>) {
  return `data: ${JSON.stringify(obj)}\n\n`
}

export async function POST(req: NextRequest) {
  try {
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
          send({ ok: true, mode: prepared.mode })

          let full = ''
          if (prepared.stream) {
            for await (const delta of prepared.stream) {
              full += delta
              send({ delta })
            }
          }

          if (!full.trim()) {
            full = prepared.fallback
            send({ delta: full, mode: 'local' })
          }

          send({ done: true, reply: full })
        } catch (error) {
          console.error('ai-chat stream', error)
          send({ delta: prepared.fallback, mode: 'local' })
          send({ done: true, reply: prepared.fallback })
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
    console.error('ai-chat handler', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'AI error',
      },
      { status: 500 }
    )
  }
}
