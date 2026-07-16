import { products, slideImages, translations } from './content'
import type { AboutSettings, SiteData } from '../types/siteData'

export const DEFAULT_ADMIN_EMAIL = 'admin@dorghamcnc.com'
export const DEFAULT_ADMIN_PASSWORD = 'dorgham2026'

export const DEFAULT_ABOUT_IMAGE =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'

export function createDefaultAboutSettings(): AboutSettings {
  const ar = translations.ar.about
  const en = translations.en.about

  return {
    title: { ar: ar.title, en: en.title },
    subtitle: { ar: ar.subtitle, en: en.subtitle },
    story: { ar: ar.story, en: en.story },
    storyText: { ar: ar.storyText, en: en.storyText },
    mission: { ar: ar.mission, en: en.mission },
    missionText: { ar: ar.missionText, en: en.missionText },
    vision: { ar: ar.vision, en: en.vision },
    visionText: { ar: ar.visionText, en: en.visionText },
    image: DEFAULT_ABOUT_IMAGE,
    stats: ar.stats.map((stat, i) => ({
      value: stat.value,
      label: { ar: stat.label, en: en.stats[i]?.label ?? stat.label },
    })),
  }
}

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
    about: createDefaultAboutSettings(),
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
