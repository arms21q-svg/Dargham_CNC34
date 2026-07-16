import { prisma } from './db'
import {
  geminiGenerateContent,
  geminiStreamContent,
  getGeminiApiKey,
  getGeminiModels,
  logEnvHealth,
  serviceUnavailableMessage,
  type GeminiResult,
} from './geminiClient'

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
const MAX_HISTORY_CHARS = 500
const MAX_PRODUCTS_IN_PROMPT = 16
const MAX_DESC_CHARS = 90
const ANSWER_CACHE_TTL_MS = 5 * 60_000
const ANSWER_CACHE_MAX = 80

type AnswerCacheEntry = { at: number; reply: string; mode: string }
const answerCache = new Map<string, AnswerCacheEntry>()
const inflightChat = new Map<string, Promise<{ status: number; body: Record<string, unknown> }>>()

let envLogged = false
function ensureEnvLogged() {
  if (envLogged) return
  envLogged = true
  logEnvHealth()
}

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

function answerCacheKey(lang: string, message: string, hasImage: boolean) {
  return `${lang}:${hasImage ? '1' : '0'}:${message.trim().toLowerCase().slice(0, 240)}`
}

function getCachedAnswer(key: string): AnswerCacheEntry | null {
  const hit = answerCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > ANSWER_CACHE_TTL_MS) {
    answerCache.delete(key)
    return null
  }
  return hit
}

function setCachedAnswer(key: string, reply: string, mode: string) {
  if (answerCache.size >= ANSWER_CACHE_MAX) {
    const oldest = answerCache.keys().next().value
    if (oldest) answerCache.delete(oldest)
  }
  answerCache.set(key, { at: Date.now(), reply, mode })
}

function isUnavailableKind(kind?: string) {
  return kind === 'quota' || kind === 'timeout' || kind === 'auth' || kind === 'server' || kind === 'network'
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
    return [
      'أنت المساعد الرسمي لموقع ورشة «ضرغام CNC» في العراق.',
      'أجب بالعربية الفصحى الواضحة، بأسلوب ودود ومحترف، في 2–6 جمل.',
      'اعتمد فقط على بيانات الموقع والكتالوج أدناه. لا تختلق أسعاراً أو مواعيد غير موجودة.',
      'للأسعار والطلبات والقياسات المخصصة: وجّه العميل إلى واتساب المذكور.',
      'إن وُجدت أعمال مشابهة في الكتالوج فاذكر أسماءها باختصار.',
      withImage
        ? 'إذا أُرفقت صورة: صف نوع التصميم والخامة المحتملة واقترح أقرب عمل من الكتالوج إن أمكن.'
        : '',
      'لا تذكر أنك نموذج لغوي إلا إذا سُئلت مباشرة.',
      '',
      'بيانات الموقع:',
      siteContext,
    ]
      .filter(Boolean)
      .join('\n')
  }

  return [
    'You are the official assistant for Dorgham CNC workshop in Iraq.',
    'Reply in clear English, friendly and professional, in 2–6 sentences.',
    'Use ONLY the site catalog/context below. Do not invent prices or lead times.',
    'For pricing, orders, and custom sizing: direct the customer to the WhatsApp number provided.',
    'If similar catalog works exist, mention their titles briefly.',
    withImage
      ? 'If an image is attached: describe the design/material and suggest the closest catalog work when possible.'
      : '',
    'Do not mention being an AI model unless asked.',
    '',
    'Site data:',
    siteContext,
  ]
    .filter(Boolean)
    .join('\n')
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

/** Stream Gemini tokens (SSE). Yields text deltas; returns final GeminiResult. */
export async function* streamGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
): AsyncGenerator<string, GeminiResult, unknown> {
  ensureEnvLogged()
  const contents = buildGeminiContents(history, userParts)
  const body = geminiBody(systemPrompt, contents)
  return yield* geminiStreamContent({
    apiKey,
    body,
    models: getGeminiModels(),
  })
}

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
): Promise<GeminiResult> {
  ensureEnvLogged()
  const contents = buildGeminiContents(history, userParts)
  return geminiGenerateContent({
    apiKey,
    body: geminiBody(systemPrompt, contents),
    models: getGeminiModels(),
  })
}

export async function callGeminiText(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<GeminiResult> {
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
  ensureEnvLogged()
  const { message = '', lang = 'ar', history = [], imageBase64, mimeType } = input
  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })
  const trimmed = message?.trim() ?? ''
  const recent = trimHistory(history, HISTORY_LIMIT)

  if (!trimmed && !image) {
    return { status: 400, body: { ok: false, error: 'الرسالة أو الصورة مطلوبة' } }
  }

  const cacheKey = answerCacheKey(replyLang, trimmed || '[image]', Boolean(image))
  if (!image) {
    const cached = getCachedAnswer(cacheKey)
    if (cached) {
      return {
        status: 200,
        body: { ok: true, reply: cached.reply, mode: cached.mode, cached: true },
      }
    }
  }

  const existing = inflightChat.get(cacheKey)
  if (existing && !image) return existing

  const run = (async (): Promise<{ status: number; body: Record<string, unknown> }> => {
    try {
      const runtime = await getAiRuntime(replyLang)
      if (!runtime.ok) {
        return { status: 403, body: { ok: false, error: runtime.error } }
      }

      const geminiKey = getGeminiApiKey()
      const openAiKey = process.env.OPENAI_API_KEY
      const { context, whatsapp } = runtime
      const userText =
        trimmed ||
        (replyLang === 'ar'
          ? 'حلّل هذه الصورة واقترح ما يمكننا تنفيذه.'
          : 'Analyze this image and suggest what we can make.')

      const unavailable = serviceUnavailableMessage(replyLang)
      const systemPrompt = buildSystemPrompt(replyLang, context, Boolean(image))

      if (image) {
        let lastKind: string | undefined

        if (geminiKey) {
          const result = await callGemini(geminiKey, systemPrompt, recent, [
            { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
            { text: userText },
          ])
          if (result.ok && result.text) {
            return { status: 200, body: { ok: true, reply: result.text, mode: 'gemini-vision' } }
          }
          lastKind = result.kind
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

        if (isUnavailableKind(lastKind) || geminiKey || openAiKey) {
          return {
            status: 200,
            body: {
              ok: true,
              reply: unavailable,
              mode: 'unavailable',
              errorKind: lastKind || 'unknown',
            },
          }
        }

        return {
          status: 200,
          body: { ok: true, reply: localImageAnalysis(replyLang, whatsapp), mode: 'local-image' },
        }
      }

      if (!geminiKey && !openAiKey) {
        return {
          status: 200,
          body: {
            ok: true,
            reply: unavailable,
            mode: 'unavailable',
            missingKey: true,
            errorKind: 'invalid_key',
          },
        }
      }

      let reply: string | null = null
      let mode = 'unavailable'
      let lastKind: string | undefined

      if (geminiKey) {
        const result = await callGeminiText(geminiKey, systemPrompt, recent, trimmed)
        if (result.ok && result.text) {
          reply = result.text
          mode = 'gemini'
        } else {
          lastKind = result.kind
        }
      }

      if (!reply && openAiKey) {
        reply = await callOpenAi(openAiKey, systemPrompt, recent, trimmed)
        if (reply) mode = 'openai'
      }

      if (!reply) {
        return {
          status: 200,
          body: {
            ok: true,
            reply: unavailable,
            mode: 'unavailable',
            errorKind: lastKind || 'unknown',
          },
        }
      }

      setCachedAnswer(cacheKey, reply, mode)
      return { status: 200, body: { ok: true, reply, mode } }
    } catch (error) {
      console.error('[ai] chat error', error instanceof Error ? error.message : error)
      return {
        status: 200,
        body: {
          ok: true,
          reply: serviceUnavailableMessage(replyLang),
          mode: 'unavailable',
          errorKind: 'unknown',
        },
      }
    } finally {
      inflightChat.delete(cacheKey)
    }
  })()

  if (!image) inflightChat.set(cacheKey, run)
  return run
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
      unavailableFallback: boolean
      cachedReply?: string
      stream: AsyncGenerator<string, GeminiResult, unknown> | null
    }
> {
  ensureEnvLogged()
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

  const geminiKey = getGeminiApiKey()
  const { context } = runtime
  const userText =
    trimmed ||
    (replyLang === 'ar'
      ? 'حلّل هذه الصورة واقترح ما يمكننا تنفيذه.'
      : 'Analyze this image and suggest what we can make.')

  const withImage = Boolean(image)
  const systemPrompt = buildSystemPrompt(replyLang, context, withImage)
  const unavailable = serviceUnavailableMessage(replyLang)

  if (!withImage) {
    const cached = getCachedAnswer(answerCacheKey(replyLang, trimmed, false))
    if (cached) {
      return {
        ok: true,
        mode: cached.mode,
        fallback: cached.reply,
        unavailableFallback: cached.mode === 'unavailable',
        cachedReply: cached.reply,
        stream: null,
      }
    }
  }

  if (!geminiKey) {
    return {
      ok: true,
      mode: 'unavailable',
      fallback: unavailable,
      unavailableFallback: true,
      stream: null,
    }
  }

  const userParts =
    withImage && image
      ? [
          { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
          { text: userText },
        ]
      : [{ text: trimmed }]

  return {
    ok: true,
    mode: withImage ? 'gemini-vision' : 'gemini',
    fallback: unavailable,
    unavailableFallback: true,
    stream: streamGemini(geminiKey, systemPrompt, recent, userParts),
  }
}
