import type { VercelRequest, VercelResponse } from '@vercel/node'
import '../../server/loadEnv.js'
import { handleAiChat, type ChatMessage } from '../../server/aiCore.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
    const result = await handleAiChat({
      message: body.message,
      lang: body.lang,
      history: (body.history ?? []) as ChatMessage[],
      imageBase64: body.imageBase64,
      mimeType: body.mimeType,
    })
    res.status(result.status).json(result.body)
  } catch (error) {
    console.error('ai/chat handler', error)
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'AI error',
    })
  }
}
