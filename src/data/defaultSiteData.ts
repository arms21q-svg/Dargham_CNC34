import { products, slideImages, translations } from './content'
import type { SiteData } from '../types/siteData'

export const DEFAULT_ADMIN_EMAIL = 'admin@dorghamcnc.com'
export const DEFAULT_ADMIN_PASSWORD = 'dorgham2026'

export function createDefaultSiteData(): SiteData {
  const ar = translations.ar
  const en = translations.en

  return {
    version: 1,
    updatedAt: 0,
    home: {
      heroTitle: { ar: ar.home.heroTitle, en: en.home.heroTitle },
      heroSubtitle: { ar: ar.home.heroSubtitle, en: en.home.heroSubtitle },
      heroDesc: { ar: ar.home.heroDesc, en: en.home.heroDesc },
      slideImages: [...slideImages],
    },
    contact: {
      whatsapp: '9647701234567',
      facebook: 'https://www.facebook.com/dorghamcnc',
      mapsUrl: 'https://maps.google.com/?q=Baghdad,Iraq',
      address: { ar: ar.contact.address, en: 'Baghdad, Iraq' },
      whatsappMessage: {
        ar: 'مرحباً، أود الاستفسار عن خدمات ضرغام CNC',
        en: 'Hello, I would like to inquire about Dorgham CNC services',
      },
      aiAssistant: {
        enabled: true,
        welcomeMessage: {
          ar: 'مرحباً! أنا مساعد ضرغام CNC. اسألني عن أعمالنا، الأسعار، أو الخدمات.',
          en: 'Hello! I am Dorgham CNC assistant. Ask me about our works, prices, or services.',
        },
      },
    },
    products: JSON.parse(JSON.stringify(products)),
    managers: [
      {
        id: '1',
        name: { ar: 'أحمد ضرغام', en: 'Ahmad Dorgham' },
        role: { ar: 'المدير العام', en: 'General Manager' },
        phone: '07701234567',
        whatsapp: '9647701234567',
      },
    ],
    settings: {
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
    },
  }
}
