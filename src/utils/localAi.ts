import type { SiteData } from '../types/siteData'

/** Client-side fallback when /api/ai is unreachable. */
export function localAiReply(message: string, lang: 'ar' | 'en', siteData: SiteData): string {
  const text = message.toLowerCase()
  const whatsapp = siteData.contact.whatsapp
  const works = siteData.products.slice(0, 4).map((p) => p.title[lang]).filter(Boolean)
  const worksHint =
    works.length > 0
      ? lang === 'ar'
        ? `\nأمثلة من أعمالنا: ${works.join('، ')}.`
        : `\nExamples from our works: ${works.join(', ')}.`
      : ''

  if (/whatsapp|واتس|تواصل|contact|price|سعر|طلب|order|كم|تكلف|cost/.test(text)) {
    return lang === 'ar'
      ? `يمكنك التواصل معنا عبر واتساب: ${whatsapp} — سنرد عليك بأسعار وتفاصيل دقيقة.${worksHint}`
      : `Contact us on WhatsApp: ${whatsapp} — we will reply with exact prices and details.${worksHint}`
  }

  if (/custom|مخصص|تصميم|design|فكرت|idea/.test(text)) {
    return lang === 'ar'
      ? `ننفّذ تصاميمك الخاصة بدقة CNC عالية. أرسل فكرتك أو صورتك عبر واتساب: ${whatsapp}`
      : `We bring your custom designs to life with high-precision CNC. WhatsApp: ${whatsapp}`
  }

  if (/work|product|عمل|خشب|wood|أعمال|cnc|جدار|door|باب/.test(text)) {
    const items = siteData.products.slice(0, 5).map((p) => {
      const title = p.title[lang]
      const materials = p.materials[lang]
      return `• ${title}${materials ? ` (${materials})` : ''}`
    })

    return lang === 'ar'
      ? `أعمالنا تشمل:\n${items.join('\n') || '• تصاميم خشبية متنوعة'}\n\nتصفّح صفحة «أعمالنا» أو واتساب: ${whatsapp}`
      : `Our works include:\n${items.join('\n') || '• Various wood designs'}\n\nBrowse Works or WhatsApp: ${whatsapp}`
  }

  if (/address|عنوان|موقع|location|where|أين|map|خريطة/.test(text)) {
    return lang === 'ar'
      ? `عنواننا: ${siteData.contact.address.ar}\nافتح الموقع من زر «المواقع» أو واتساب: ${whatsapp}`
      : `Our address: ${siteData.contact.address.en}\nOpen the map from Links or WhatsApp: ${whatsapp}`
  }

  if (/time|مدة|delivery|تسليم|متى|when|duration/.test(text)) {
    return lang === 'ar'
      ? `مدة التنفيذ تعتمد على حجم وتعقيد التصميم. تواصل عبر واتساب: ${whatsapp}`
      : `Delivery time depends on design complexity. WhatsApp: ${whatsapp}`
  }

  return lang === 'ar'
    ? `شكراً لسؤالك! أساعدك في الأعمال، الأسعار، التصميم المخصص، والموقع.${worksHint}\nأو تواصل مباشرة عبر واتساب: ${whatsapp}`
    : `Thanks! I can help with works, pricing, custom designs, and location.${worksHint}\nOr WhatsApp: ${whatsapp}`
}
