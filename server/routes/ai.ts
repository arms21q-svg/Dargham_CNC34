import { Router } from 'express'
import { prisma } from '../db.js'

const router = Router()

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ImagePayload {
  imageBase64?: string
  mimeType?: string
}

function parseImagePayload(body: ImagePayload) {
  const imageBase64 = body.imageBase64?.trim()
  const mimeType = body.mimeType?.startsWith('image/') ? body.mimeType : 'image/jpeg'
  if (!imageBase64 || imageBase64.length < 100) return null
  return { imageBase64, mimeType }
}

async function buildSiteContext(lang: 'ar' | 'en') {
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

  if (!config) return { context: '', products: [] as typeof products }

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

  return { context, products }
}

function buildSystemPrompt(lang: 'ar' | 'en', siteContext: string, withImage = false) {
  const imageRules =
    lang === 'ar'
      ? withImage
        ? '- عند إرسال صورة: صف التصميم (نوع الخشب، النقوش، الألوان، الاستخدام المقترح) واقترح أعمالاً مشابهة من الكatalog إن وُجدت.\n'
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

function localReply(message: string, lang: 'ar' | 'en', whatsapp: string): string {
  const text = message.toLowerCase()

  if (/whatsapp|واتس|تواصل|contact|price|سعر|طلب|order|كم/.test(text)) {
    return lang === 'ar'
      ? `يمكنك التواصل معنا عبر واتساب: ${whatsapp}`
      : `You can reach us on WhatsApp: ${whatsapp}`
  }

  if (/work|product|عمل|تصميم|design|خشب|wood|أعمال/.test(text)) {
    return lang === 'ar'
      ? 'لدينا مجموعة واسعة من الأعمال الخشبية بتقنية CNC. تصفّح صفحة «أعمالنا» أو اسأل عن نوع معين (جداريات، أبواب، ديكور...).'
      : 'We offer many CNC wood works. Browse our Works page or ask about a specific type (panels, doors, decor...).'
  }

  return lang === 'ar'
    ? 'شكراً لسؤالك! للتفاصيل الدقيقة والأسعار، تواصل معنا عبر واتساب وسنساعدك بسرعة.'
    : 'Thanks for your question! For exact details and pricing, contact us on WhatsApp and we will help you quickly.'
}

function localImageAnalysis(lang: 'ar' | 'en', whatsapp: string): string {
  return lang === 'ar'
    ? `تم استلام الصورة. يبدو أنها تصميم خشبي/ديكور — يمكننا تنفيذ تصاميم مشابهة بدقة CNC.\n\nللتقييم الدقيق والسعر، أرسل الصورة عبر واتساب: ${whatsapp}`
    : `Image received. It looks like a wood/design piece — we can produce similar CNC designs with high precision.\n\nFor an exact quote, send the image on WhatsApp: ${whatsapp}`
}

async function callGeminiText(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): Promise<string | null> {
  return callGemini(apiKey, systemPrompt, history, [{ text: message.trim() }])
}

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  history: ChatMessage[],
  userParts: { text?: string; inlineData?: { mimeType: string; data: string } }[]
): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

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
    console.error('Gemini error:', await res.text())
    return null
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[] }
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null
}

async function callOpenAiVision(
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
    choices?: { message?: { content?: string } }[] }
  }

  return data.choices?.[0]?.message?.content?.trim() ?? null
}

async function callOpenAi(
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
    choices?: { message?: { content?: string } }[] }
  }

  return data.choices?.[0]?.message?.content?.trim() ?? null
}

function extractProductIds(text: string, validIds: Set<string>): string[] {
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
      // ignore invalid JSON
    }
  }

  return ids.slice(0, 8)
}

async function ensureAiEnabled(lang: 'ar' | 'en') {
  const config = await prisma.siteConfig.findUnique({ where: { id: 1 } })
  const aiEnabled = config ? (config as { aiEnabled?: boolean }).aiEnabled !== false : true

  if (!aiEnabled) {
    return {
      ok: false as const,
      error: lang === 'ar' ? 'المساعد الذكي غير مفعّل' : 'AI assistant is disabled',
    }
  }

  return { ok: true as const, config, whatsapp: config?.whatsapp ?? '9647701234567' }
}

router.post('/chat', async (req, res) => {
  const { message = '', lang = 'ar', history = [], imageBase64, mimeType } = req.body as {
    message?: string
    lang?: 'ar' | 'en'
    history?: ChatMessage[]
    imageBase64?: string
    mimeType?: string
  }

  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })
  const trimmed = message?.trim() ?? ''

  if (!trimmed && !image) {
    res.status(400).json({ ok: false, error: 'الرسالة أو الصورة مطلوبة' })
    return
  }

  try {
    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      res.status(403).json({ ok: false, error: gate.error })
      return
    }

    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY
    const userText =
      trimmed ||
      (replyLang === 'ar' ? 'حلّل هذه الصورة واقترح ما يمكننا تنفيذه.' : 'Analyze this image and suggest what we can make.')

    if (image && geminiKey) {
      const { context } = await buildSiteContext(replyLang)
      const systemPrompt = buildSystemPrompt(replyLang, context, true)
      const reply = await callGemini(geminiKey, systemPrompt, history, [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: userText },
      ])

      if (reply) {
        res.json({ ok: true, reply, mode: 'gemini-vision' })
        return
      }
    }

    if (image && openAiKey) {
      const { context } = await buildSiteContext(replyLang)
      const systemPrompt = buildSystemPrompt(replyLang, context, true)
      const reply = await callOpenAiVision(openAiKey, systemPrompt, userText, image.imageBase64, image.mimeType)

      if (reply) {
        res.json({ ok: true, reply, mode: 'openai-vision' })
        return
      }
    }

    if (image) {
      res.json({
        ok: true,
        reply: localImageAnalysis(replyLang, gate.whatsapp),
        mode: 'local-image',
      })
      return
    }

    const fallback = localReply(trimmed, replyLang, gate.whatsapp)

    if (!geminiKey && !openAiKey) {
      res.json({ ok: true, reply: fallback, mode: 'local' })
      return
    }

    const { context } = await buildSiteContext(replyLang)
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

    res.json({
      ok: true,
      reply: reply || fallback,
      mode,
    })
  } catch (error) {
    console.error('AI chat error:', error)
    res.json({
      ok: true,
      reply: image
        ? localImageAnalysis(replyLang, '9647701234567')
        : localReply(trimmed, replyLang, '9647701234567'),
      mode: 'local',
    })
  }
})

router.post('/analyze-image', async (req, res) => {
  const { lang = 'ar', message, imageBase64, mimeType } = req.body as {
    lang?: 'ar' | 'en'
    message?: string
    imageBase64?: string
    mimeType?: string
  }

  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })

  if (!image) {
    res.status(400).json({ ok: false, error: 'الصورة مطلوبة' })
    return
  }

  try {
    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      res.status(403).json({ ok: false, error: gate.error })
      return
    }

    const prompt =
      message?.trim() ||
      (replyLang === 'ar'
        ? 'حلّل هذه الصورة: نوع التصميم، الألوان، الخامة المحتملة، وهل يمكن تنفيذها بتقنية CNC؟'
        : 'Analyze this image: design type, colors, likely material, and CNC feasibility.')

    const { context } = await buildSiteContext(replyLang)
    const systemPrompt = buildSystemPrompt(replyLang, context, true)
    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY

    if (geminiKey) {
      const reply = await callGemini(geminiKey, systemPrompt, [], [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: prompt },
      ])
      if (reply) {
        res.json({ ok: true, reply, mode: 'gemini-vision' })
        return
      }
    }

    if (openAiKey) {
      const reply = await callOpenAiVision(openAiKey, systemPrompt, prompt, image.imageBase64, image.mimeType)
      if (reply) {
        res.json({ ok: true, reply, mode: 'openai-vision' })
        return
      }
    }

    res.json({
      ok: true,
      reply: localImageAnalysis(replyLang, gate.whatsapp),
      mode: 'local-image',
    })
  } catch (error) {
    console.error('Analyze image error:', error)
    res.json({
      ok: true,
      reply: localImageAnalysis(replyLang, '9647701234567'),
      mode: 'local-image',
    })
  }
})

router.post('/search-by-image', async (req, res) => {
  const { lang = 'ar', imageBase64, mimeType } = req.body as {
    lang?: 'ar' | 'en'
    imageBase64?: string
    mimeType?: string
  }

  const replyLang = lang === 'en' ? 'en' : 'ar'
  const image = parseImagePayload({ imageBase64, mimeType })

  if (!image) {
    res.status(400).json({ ok: false, error: 'الصورة مطلوبة' })
    return
  }

  try {
    const gate = await ensureAiEnabled(replyLang)
    if (!gate.ok) {
      res.status(403).json({ ok: false, error: gate.error })
      return
    }

    const { context, products } = await buildSiteContext(replyLang)
    const validIds = new Set(products.map((p) => p.id))

    const searchPrompt =
      replyLang === 'ar'
        ? `أنت نظام مطابقة صور. قارن الصورة المرفقة مع قائمة الأعمال أدناه.
أعد فقط JSON array بمعرّفات id للأعمال الأكثر تشابهاً (3 إلى 6 ids) بدون أي نص آخر.
مثال: ["id1","id2"]

${context}`
        : `You are an image matching system. Compare the attached image with the works list below.
Return ONLY a JSON array of the most similar work ids (3 to 6 ids), no other text.
Example: ["id1","id2"]

${context}`

    const geminiKey = process.env.GEMINI_API_KEY
    const openAiKey = process.env.OPENAI_API_KEY
    let productIds: string[] = []
    let analysis: string | undefined
    let mode = 'local'

    if (geminiKey) {
      const reply = await callGemini(geminiKey, searchPrompt, [], [
        { inlineData: { mimeType: image.mimeType, data: image.imageBase64 } },
        { text: replyLang === 'ar' ? 'أوجد أقرب الأعمال.' : 'Find closest works.' },
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
        replyLang === 'ar' ? 'أوجد أقرب الأعمال.' : 'Find closest works.',
        image.imageBase64,
        image.mimeType
      )

      if (reply) {
        productIds = extractProductIds(reply, validIds)
        analysis = reply
        mode = 'openai-vision'
      }
    }

    res.json({
      ok: true,
      productIds,
      analysis,
      mode,
    })
  } catch (error) {
    console.error('Search by image error:', error)
    res.json({ ok: true, productIds: [], mode: 'local' })
  }
})

export { router as aiRouter }
