import { NextRequest, NextResponse } from 'next/server'
import { handleAiChat, type ChatMessage } from '@server/aiCore'

export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: string
      lang?: string
      history?: ChatMessage[]
      imageBase64?: string
      mimeType?: string
    }
    const result = await handleAiChat({
      message: body.message,
      lang: body.lang === 'en' ? 'en' : 'ar',
      history: body.history ?? [],
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
    })
    return NextResponse.json(result.body, { status: result.status })
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
