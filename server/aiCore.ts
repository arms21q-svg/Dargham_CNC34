import { prisma } from './db.js'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ImagePayload {
  imageBase64?: string
  mimeType?: string
}

export function parseImagePayload(body: ImagePayload) {
  const imageBase64 = body.imageBase64?.trim()
  const mimeType = body.mimeType?.startsWith('image/') ? body.mimeType : 'image/jpeg'
  if (!imageBase64 || imageBase64.length < 100) return null
  return { imageBase64, mimeType }
}

export async function buildSiteContext(lang: 'ar' | 'en') {
  const [config, products] = await Promise.all([
    prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: {
        addressAr: true,
        addressEn: true,
        whatsapp: true,
        facebook: true,
      },
    }),
    prisma.product.findMany({
      orderBy: { sortOrder: 'asc' },
      take: 12,
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        materialsAr: true,
        materialsEn: true,
        dimensionsAr: true,
        dimensionsEn: true,
        featured: true,
      },
    }),
  ])

  if (!config) return { context: '', products: [] as typeof products, whatsapp: '9647701234567' }

  const works = products
    .map((p) => {
      const title = lang === 'ar' ? p.titleAr : p.titleEn
      const desc = lang === 'ar' ? p.descriptionAr : p.descriptionEn
      const materials = lang === 'ar' ? p.materialsAr : p.materialsEn
      const dims = lang === 'ar' ? p.dimensionsAr : p.dimensionsEn
      return `- id:${p.id} | ${title}${p.featured ? ' (featured)' : ''}\n  Materials: ${materials}\n  Size: ${dims}\n  ${desc.slice(0, 120)}`
    })
    .join('\n')

  const context = [
    `Company: Dorgham CNC — luxury wood CNC designs in Iraq.`,
    `Services: custom panels, wall art, doors, decor, Islamic/geometric designs.`,
    `Address: ${lang === 'ar' ? config.addressAr : config.addressEn}`,
    `WhatsApp: ${config.whatsapp}`,
    `Facebook: ${config.facebook}`,
    `Works catalog:\n${works || 'No works listed yet.'}`,
  ].join('\n')

  return { context, products, whatsapp: config.whatsapp }
}

export function buildSystemPrompt(lang: 'ar' | 'en', siteContext: string, withImage = false) {
  const imageRules =
    lang === 'ar'
      ? withImage
        ? '- عند إرسال صورة: صف التصميم (نوع الخشب، النقوش، الألوان، الاستخدام المقترح) واقترح أعمالاً مشابهة من الكتالوج إن وُجدت.\n'
        : ''
      : withImage
        ? '- When an image is sent: describe the design (wood type, patterns, colors, suggested use) and suggest similar works from the catalog if any.\n'
        : ''

  return lang === 'ar'
    ? `أنت مساعد ذكي لموقع ضرغام CNC — شركة نحت خشب بتقنية CNC في العراق.
قواعد:
- أجب بالعربية بوضوح واختصار (3-6 جمل).
- استخدم معلومات الموقع أدناه فقط.
- عند السؤال عن السعر: وجّه للواتساب مع رقم WhatsApp.
- عند السؤال عن تصميم مخصص: اشرح أننا ننفّذ أي تصميم بدقة.
${imageRules}- كن ودوداً ومحترفاً.

${siteContext}`
    : `You are the smart assistant for Dorgham CNC — luxury wood CNC company in Iraq.
Rules:
- Reply in English clearly and briefly (3-6 sentences).
- Use only the site info below.
- For pricing: direct to WhatsApp with the number.
- For custom designs: explain we execute any design with high precision.
${imageRules}- Be friendly and professional.

${siteContext}`
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

export async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
): Promise<string | null> {
  const preferred = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const models = Array.from(
    new Set([preferred, 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-flash-latest'])
  )

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

  const contents = [
    ...history.slice(-4).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts },
  ]

  let lastError = ''

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 700,
          },
        }),
      })

      if (!res.ok) {
        lastError = await res.text()
        console.error(`Gemini error (${model}):`, lastError.slice(0, 400))
        continue
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      if (text) return text
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      console.error(`Gemini fetch failed (${model}):`, lastError)
    }
  }

  if (lastError) console.error('Gemini all models failed:', lastError.slice(0, 400))
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
      max_tokens: 600,
      temperature: 0.7,
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
        ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message.trim() },
      ],
      max_tokens: 400,
      temperature: 0.7,
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
  const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
  const aiEnabled = config ? config.aiEnabled !== false : true

  if (!aiEnabled) {
    return {
      ok: false as const,
      error: lang === 'ar' ? 'المساعد الذكي غير مفعّل' : 'AI assistant is disabled',
    }
  }

  return { ok: true as const, config, whatsapp: config?.whatsapp ?? '9647701234567' }
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

  if (!trimmed && !image) {
    return { status: 400, body: { ok: false, error: 'الرسالة أو الصورة مطلوبة' } }
  }

  try {
    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      return { status: 403, body: { ok: false, error: gate.error } }
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY
    const { context, products, whatsapp } = await buildSiteContext(replyLang)
    const titles = products.map((p) => (replyLang === 'ar' ? p.titleAr : p.titleEn))
    const userText =
      trimmed ||
      (replyLang === 'ar'
        ? 'حلّل هذه الصورة واقترح ما يمكننا تنفيذه.'
        : 'Analyze this image and suggest what we can make.')

    if (image && geminiKey) {
      const systemPrompt = buildSystemPrompt(replyLang, context, true)
      const reply = await callGemini(geminiKey, systemPrompt, history, [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: userText },
      ])
      if (reply) return { status: 200, body: { ok: true, reply, mode: 'gemini-vision' } }
    }

    if (image && openAiKey) {
      const systemPrompt = buildSystemPrompt(replyLang, context, true)
      const reply = await callOpenAiVision(
        openAiKey,
        systemPrompt,
        userText,
        image.imageBase64,
        image.mimeType
      )
      if (reply) return { status: 200, body: { ok: true, reply, mode: 'openai-vision' } }
    }

    if (image) {
      return {
        status: 200,
        body: {
          ok: true,
          reply: localImageAnalysis(replyLang, whatsapp || gate.whatsapp),
          mode: 'local-image',
        },
      }
    }

    const fallback = localReply(trimmed, replyLang, whatsapp || gate.whatsapp, titles)

    if (!geminiKey && !openAiKey) {
      return { status: 200, body: { ok: true, reply: fallback, mode: 'local', missingKey: true } }
    }

    const systemPrompt = buildSystemPrompt(replyLang, context)
    let reply: string | null = null
    let mode = 'local'

    if (geminiKey) {
      reply = await callGeminiText(geminiKey, systemPrompt, history, trimmed)
      if (reply) mode = 'gemini'
    }

    if (!reply && openAiKey) {
      reply = await callOpenAi(openAiKey, systemPrompt, history, trimmed)
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
