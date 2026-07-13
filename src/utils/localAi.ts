import type { SiteData } from '../types/siteData'

export function localAiReply(message: string, lang: 'ar' | 'en', siteData: SiteData): string {
  const text = message.toLowerCase()
  const whatsapp = siteData.contact.whatsapp

  if (/whatsapp|واتس|تواصل|contact|price|سعر|طلب|order|كم|تكلف|cost/.test(text)) {
    return lang === 'ar'
      ? `يمكنك التواصل معنا عبر واتساب: ${whatsapp} — سنرد عليك بأسعار وتفاصيل دقيقة.`
      : `Contact us on WhatsApp: ${whatsapp} — we will reply with exact prices and details.`
  }

  if (/custom|مخصص|تصميم|design|فكرت|idea/.test(text)) {
    return lang === 'ar'
      ? 'ننفّذ تصاميمك الخاصة بدقة CNC عالية. أرسل فكرتك أو صورتك عبر واتساب وسنعرض عليك معاينة قبل التنفيذ.'
      : 'We bring your custom designs to life with high-precision CNC. Send your idea via WhatsApp for a preview before production.'
  }

  if (/work|product|عمل|خشب|wood|أعمال|cnc|جدار|door|باب/.test(text)) {
    const items = siteData.products.slice(0, 5).map((p) => {
      const title = p.title[lang]
      const materials = p.materials[lang]
      return `• ${title}${materials ? ` (${materials})` : ''}`
    })

    return lang === 'ar'
      ? `أعمالنا تشمل:\n${items.join('\n') || '• تصاميم خشبية متنوعة'}\n\nتصفّح صفحة «أعمالنا» لرؤية المزيد.`
      : `Our works include:\n${items.join('\n') || '• Various wood designs'}\n\nBrowse our Works page for more.`
  }

  if (/address|عنوان|موقع|location|where|أين|map|خريطة/.test(text)) {
    return lang === 'ar'
      ? `عنواننا: ${siteData.contact.address.ar}\nيمكنك فتح موقعنا على الخريطة من زر «المواقع» أسفل الصفحة.`
      : `Our address: ${siteData.contact.address.en}\nOpen our map from the "Links" button at the bottom.`
  }

  if (/time|مدة|delivery|تسليم|متى|when|duration/.test(text)) {
    return lang === 'ar'
      ? 'مدة التنفيذ تعتمد على حجم وتعقيد التصميم. تواصل معنا عبر واتساب وسنخبرك بالمدة المتوقعة لمشروعك.'
      : 'Delivery time depends on design size and complexity. Contact us on WhatsApp for an estimated timeline.'
  }

  return lang === 'ar'
    ? 'شكراً لسؤالك! يمكنني مساعدتك في الأعمال، الأسعار، التصميم المخصص، والموقع. أو تواصل مباشرة عبر واتساب.'
    : 'Thanks! I can help with works, pricing, custom designs, and location — or contact us directly on WhatsApp.'
}
