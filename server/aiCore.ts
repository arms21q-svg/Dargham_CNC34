import { prisma } from './db'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ImagePayload {
  imageBase64?: string
  mimeType?: string
}

export const HISTORY_LIMIT = 10
const CONTEXT_CACHE_TTL_MS = 60_000
const MAX_HISTORY_CHARS = 400
const MAX_PRODUCTS_IN_PROMPT = 8
const MAX_DESC_CHARS = 60

type CachedRuntime = {
  at: number
  lang: 'ar' | 'en'
  aiEnabled: boolean
  whatsapp: string
  context: string
  titles: string[]
  productIds: string[]
}

let runtimeCache: CachedRuntime | null = null

export function parseImagePayload(body: ImagePayload) {
  const imageBase64 = body.imageBase64?.trim()
  const mimeType = body.mimeType?.startsWith('image/') ? body.mimeType : 'image/jpeg'
  if (!imageBase64 || imageBase64.length < 100) return null
  return { imageBase64, mimeType }
}

/** Keep last N turns and trim long messages to cut token cost. */
export function trimHistory(history: ChatMessage[] = [], limit = HISTORY_LIMIT): ChatMessage[] {
  return history
    .filter((m) => m?.content && (m.role === 'user' || m.role === 'assistant'))
    .slice(-limit)
    .map((m) => ({
      role: m.role,
      content: m.content.length > MAX_HISTORY_CHARS ? `${m.content.slice(0, MAX_HISTORY_CHARS)}…` : m.content,
    }))
}

function preferredGeminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  return Array.from(new Set([preferred, 'gemini-2.0-flash']))
}

/** Compact catalog + contact — one DB round-trip, cached briefly. */
export async function getAiRuntime(lang: 'ar' | 'en'): Promise<{
  ok: true
  whatsapp: string
  context: string
  titles: string[]
  productIds: string[]
} | {
  ok: false
  error: string
}> {
  const now = Date.now()
  if (
    runtimeCache &&
    runtimeCache.lang === lang &&
    now - runtimeCache.at < CONTEXT_CACHE_TTL_MS
  ) {
    if (!runtimeCache.aiEnabled) {
      return {
        ok: false,
        error: lang === 'ar' ? 'المساعد الذكي غير مفعّل' : 'AI assistant is disabled',
      }
    }
    return {
      ok: true,
      whatsapp: runtimeCache.whatsapp,
      context: runtimeCache.context,
      titles: runtimeCache.titles,
      productIds: runtimeCache.productIds,
    }
  }

  const [config, products] = await Promise.all([
    prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        aiEnabled: true,
        addressAr: true,
        addressEn: true,
        whatsapp: true,
      },
    }),
    prisma.product.findMany({
      orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      take: MAX_PRODUCTS_IN_PROMPT,
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        category: true,
        featured: true,
      },
    }),
  ])

  const aiEnabled = config ? config.aiEnabled !== false : true
  const whatsapp = config?.whatsapp ?? '9647701234567'
  const address = lang === 'ar' ? config?.addressAr ?? '' : config?.addressEn ?? ''

  const works = products
    .map((p) => {
      const title = lang === 'ar' ? p.titleAr : p.titleEn
      const desc = (lang === 'ar' ? p.descriptionAr : p.descriptionEn).slice(0, MAX_DESC_CHARS)
      return `${p.id}:${title}${p.featured ? '*' : ''} (${p.category}) ${desc}`
    })
    .join('\n')

  const context = [
    'Dorgham CNC | عراق | نحت خشب CNC',
    `WA:${whatsapp}`,
    address ? `Addr:${address}` : '',
    works ? `Catalog:\n${works}` : 'Catalog: empty',
  ]
    .filter(Boolean)
    .join('\n')

  const titles = products.map((p) => (lang === 'ar' ? p.titleAr : p.titleEn))
  const productIds = products.map((p) => p.id)

  runtimeCache = {
    at: now,
    lang,
    aiEnabled,
    whatsapp,
    context,
    titles,
    productIds,
  }

  if (!aiEnabled) {
    return {
      ok: false,
      error: lang === 'ar' ? 'المساعد الذكي غير مفعّل' : 'AI assistant is disabled',
    }
  }

  return { ok: true, whatsapp, context, titles, productIds }
}

/** @deprecated Prefer getAiRuntime — kept for analyze/search callers */
export async function buildSiteContext(lang: 'ar' | 'en') {
  const runtime = await getAiRuntime(lang)
  if (!runtime.ok) {
    return { context: '', products: [] as { id: string }[], whatsapp: '9647701234567' }
  }

  // Minimal shape for callers that only need ids/context
  const products = runtime.productIds.map((id, i) => ({
    id,
    titleAr: runtime.titles[i] ?? id,
    titleEn: runtime.titles[i] ?? id,
  }))

  return { context: runtime.context, products, whatsapp: runtime.whatsapp }
}

export function buildSystemPrompt(lang: 'ar' | 'en', siteContext: string, withImage = false) {
  if (lang === 'ar') {
    return `مساعد ضرغام CNC. أجب عربي باختصار (2–5 جمل). اعتمد على الموقع فقط. أسعار/طلب → واتساب. ${
      withImage ? 'الصورة: صف التصميم واقترح عملاً مشابهاً إن وُجد. ' : ''
    }ودود ومحترف.\n${siteContext}`
  }
  return `Dorgham CNC assistant. Reply briefly in English (2–5 sentences). Use site info only. Pricing/orders → WhatsApp. ${
    withImage ? 'If image: describe design and suggest a similar work if any. ' : ''
  }Friendly & professional.\n${siteContext}`
}

export function localReply(
  message: string,
  lang: 'ar' | 'en',
  whatsapp: string,
  productTitles: string[] = []
): string {
  const text = message.toLowerCase()
  const worksLine =
    productTitles.length > 0
      ? lang === 'ar'
        ? `\nمن أعمالنا: ${productTitles.slice(0, 4).join('، ')}.`
        : `\nFeatured works: ${productTitles.slice(0, 4).join(', ')}.`
      : ''

  if (/whatsapp|واتس|تواصل|contact|price|سعر|طلب|order|كم/.test(text)) {
    return lang === 'ar'
      ? `يمكنك التواصل معنا عبر واتساب: ${whatsapp} للحصول على سعر دقيق حسب المقاس والتصميم.${worksLine}`
      : `Contact us on WhatsApp: ${whatsapp} for an exact quote based on size and design.${worksLine}`
  }

  if (/work|product|عمل|تصميم|design|خشب|wood|أعمال|جدار|باب|door/.test(text)) {
    return lang === 'ar'
      ? `نقدّم أعمال خشب بتقنية CNC: جداريات، أبواب، ديكور، وتصاميم هندسية/إسلامية.${worksLine}\nتصفّح «أعمالنا» أو راسلنا على واتساب: ${whatsapp}`
      : `We offer CNC wood works: wall art, doors, decor, and geometric/Islamic designs.${worksLine}\nBrowse Works or WhatsApp us: ${whatsapp}`
  }

  if (/address|عنوان|موقع|location|where|أين|map|خريطة/.test(text)) {
    return lang === 'ar'
      ? `للتوجيه والموقع، افتح زر المواقع في الصفحة أو تواصل عبر واتساب: ${whatsapp}`
      : `For location details, use the site Links button or WhatsApp: ${whatsapp}`
  }

  return lang === 'ar'
    ? `شكراً لسؤالك! أساعد في الأعمال والأسعار والتصميم المخصص والموقع.${worksLine}\nللتفاصيل تواصل عبر واتساب: ${whatsapp}`
    : `Thanks! I can help with works, pricing, custom design, and location.${worksLine}\nFor details WhatsApp: ${whatsapp}`
}

export function localImageAnalysis(lang: 'ar' | 'en', whatsapp: string): string {
  return lang === 'ar'
    ? `تم استلام الصورة. يمكننا تنفيذ تصاميم خشبية مشابهة بدقة CNC.\n\nللتقييم والسعر، أرسل الصورة عبر واتساب: ${whatsapp}`
    : `Image received. We can produce similar CNC wood designs.\n\nFor an exact quote, send the image on WhatsApp: ${whatsapp}`
}

function buildGeminiContents(
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
) {
  const parts = userParts.map((part) => {
    if (part.inlineData) {
      return {
        inline_data: {
          mime_type: part.inlineData.mimeType,
          data: part.inlineData.data,
        },
      }
    }
    return { text: part.text ?? '' }
  })

  return [
    ...trimHistory(history, HISTORY_LIMIT).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts },
  ]
}

function geminiBody(systemPrompt: string, contents: unknown) {
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 480,
    },
  }
}

/** Stream Gemini tokens (SSE). Yields text deltas. */
export async function* streamGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
): AsyncGenerator<string, void, unknown> {
  const contents = buildGeminiContents(history, userParts)
  const body = JSON.stringify(geminiBody(systemPrompt, contents))

  for (const model of preferredGeminiModels()) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => '')
        console.error(`Gemini stream error (${model}):`, errText.slice(0, 300))
        continue
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let yielded = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const chunks = buffer.split('\n')
        buffer = chunks.pop() ?? ''

        for (const line of chunks) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const payload = trimmed.slice(5).trim()
          if (!payload || payload === '[DONE]') continue

          try {
            const json = JSON.parse(payload) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[]
            }
            const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
            if (text) {
              yielded = true
              yield text
            }
          } catch {
            // ignore partial JSON lines
          }
        }
      }

      if (yielded) return
    } catch (err) {
      console.error(`Gemini stream failed (${model}):`, err instanceof Error ? err.message : err)
    }
  }
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
): Promise<string | null> {
  const contents = buildGeminiContents(history, userParts)
  const body = JSON.stringify(geminiBody(systemPrompt, contents))

  for (const model of preferredGeminiModels()) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (!res.ok) {
        console.error(`Gemini error (${model}):`, (await res.text()).slice(0, 300))
        continue
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (text) return text
    } catch (err) {
      console.error(`Gemini fetch failed (${model}):`, err instanceof Error ? err.message : err)
    }
  }

  return null
}

export async function callGeminiText(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<string | null> {
  return callGemini(apiKey, systemPrompt, history, [{ text: message.trim() }])
}

export async function callOpenAiVision(
  apiKey: string,
  systemPrompt: string,
  message: string,
  imageBase64: string,
  mimeType: string
): Promise<string | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: message || 'Analyze this image for CNC wood design.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
      max_tokens: 400,
      temperature: 0.6,
    }),
  })

  if (!res.ok) {
    console.error('OpenAI vision error:', await res.text())
    return null
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }

  return data.choices?.[0]?.message?.content?.trim() ?? null
}

export async function callOpenAi(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<string | null> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...trimHistory(history, HISTORY_LIMIT).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message.trim() },
      ],
      max_tokens: 400,
      temperature: 0.6,
    }),
  })

  if (!res.ok) {
    console.error('OpenAI error:', await res.text())
    return null
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }

  return data.choices?.[0]?.message?.content?.trim() ?? null
}

export function extractProductIds(text: string, validIds: Set<string>): string[] {
  const ids: string[] = []
  for (const id of validIds) {
    if (text.includes(id)) ids.push(id)
  }

  const jsonMatch = text.match(/\[[\s\S]*?\]/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as unknown
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === 'string' && validIds.has(item) && !ids.includes(item)) {
            ids.push(item)
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return ids.slice(0, 8)
}

export async function ensureAiEnabled(lang: 'ar' | 'en') {
  const runtime = await getAiRuntime(lang)
  if (!runtime.ok) {
    return { ok: false as const, error: runtime.error }
  }
  return { ok: true as const, config: null, whatsapp: runtime.whatsapp }
}

export async function handleAiChat(input: {
  message?: string
  lang?: 'ar' | 'en'
  history?: ChatMessage[]
  imageBase64?: string
  mimeType?: string
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const { message = '', lang = 'ar', history = [], imageBase64, mimeType } = input
  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })
  const trimmed = message?.trim() ?? ''
  const recent = trimHistory(history, HISTORY_LIMIT)

  if (!trimmed && !image) {
    return { status: 400, body: { ok: false, error: 'الرسالة أو الصورة مطلوبة' } }
  }

  try {
    const runtime = await getAiRuntime(replyLang)
    if (!runtime.ok) {
      return { status: 403, body: { ok: false, error: runtime.error } }
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY
    const { context, titles, whatsapp } = runtime
    const userText =
      trimmed ||
      (replyLang === 'ar'
        ? 'حلّل هذه الصورة واقترح ما يمكننا تنفيذه.'
        : 'Analyze this image and suggest what we can make.')

    if (image) {
      const systemPrompt = buildSystemPrompt(replyLang, context, true)

      if (geminiKey) {
        const reply = await callGemini(geminiKey, systemPrompt, recent, [
          { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
          { text: userText },
        ])
        if (reply) return { status: 200, body: { ok: true, reply, mode: 'gemini-vision' } }
      }

      if (openAiKey) {
        const reply = await callOpenAiVision(
          openAiKey,
          systemPrompt,
          userText,
          image.imageBase64,
          image.mimeType
        )
        if (reply) return { status: 200, body: { ok: true, reply, mode: 'openai-vision' } }
      }

      return {
        status: 200,
        body: {
          ok: true,
          reply: localImageAnalysis(replyLang, whatsapp),
          mode: 'local-image',
        },
      }
    }

    const fallback = localReply(trimmed, replyLang, whatsapp, titles)

    if (!geminiKey && !openAiKey) {
      return { status: 200, body: { ok: true, reply: fallback, mode: 'local', missingKey: true } }
    }

    const systemPrompt = buildSystemPrompt(replyLang, context)
    let reply: string | null = null
    let mode = 'local'

    if (geminiKey) {
      reply = await callGeminiText(geminiKey, systemPrompt, recent, trimmed)
      if (reply) mode = 'gemini'
    }

    if (!reply && openAiKey) {
      reply = await callOpenAi(openAiKey, systemPrompt, recent, trimmed)
      if (reply) mode = 'openai'
    }

    return {
      status: 200,
      body: {
        ok: true,
        reply: reply || fallback,
        mode: reply ? mode : geminiKey || openAiKey ? 'local-after-ai-fail' : 'local',
      },
    }
  } catch (error) {
    console.error('AI chat error:', error)
    return {
      status: 200,
      body: {
        ok: true,
        reply: image
          ? localImageAnalysis(replyLang, '9647701234567')
          : localReply(trimmed, replyLang, '9647701234567'),
        mode: 'local',
      },
    }
  }
}

/** Prepare streaming chat — returns SSE meta + async text source. */
export async function prepareAiChatStream(input: {
  message?: string
  lang?: 'ar' | 'en'
  history?: ChatMessage[]
  imageBase64?: string
  mimeType?: string
}): Promise<
  | { ok: false; status: number; error: string }
  | {
      ok: true
      mode: string
      fallback: string
      stream: AsyncGenerator<string, void, unknown> | null
    }
> {
  const { message = '', lang = 'ar', history = [], imageBase64, mimeType } = input
  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })
  const trimmed = message?.trim() ?? ''
  const recent = trimHistory(history, HISTORY_LIMIT)

  if (!trimmed && !image) {
    return { ok: false, status: 400, error: 'الرسالة أو الصورة مطلوبة' }
  }

  const runtime = await getAiRuntime(replyLang)
  if (!runtime.ok) {
    return { ok: false, status: 403, error: runtime.error }
  }

  const geminiKey = process.env.GEMINI_API_KEY
  const { context, titles, whatsapp } = runtime
  const userText =
    trimmed ||
    (replyLang === 'ar'
      ? 'حلّل هذه الصورة واقترح ما يمكننا تنفيذه.'
      : 'Analyze this image and suggest what we can make.')

  const withImage = Boolean(image)
  const systemPrompt = buildSystemPrompt(replyLang, context, withImage)
  const fallback = withImage
    ? localImageAnalysis(replyLang, whatsapp)
    : localReply(trimmed, replyLang, whatsapp, titles)

  if (!geminiKey) {
    return { ok: true, mode: 'local', fallback, stream: null }
  }

  const userParts = withImage && image
    ? [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: userText },
      ]
    : [{ text: trimmed }]

  return {
    ok: true,
    mode: withImage ? 'gemini-vision' : 'gemini',
    fallback,
    stream: streamGemini(geminiKey, systemPrompt, recent, userParts),
  }
}
