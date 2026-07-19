import { products, slideImages, translations } from './content'
import type { AboutSettings, SiteData } from '../types/siteData'

export const DEFAULT_ADMIN_EMAIL = 'admin@dorghamcnc.com'
export const DEFAULT_ADMIN_PASSWORD = 'dorgham2026'

export const DEFAULT_ABOUT_IMAGE =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'

/** Kept for DB/API compatibility; About page is no longer public. */
export function createDefaultAboutSettings(): AboutSettings {
  return {
    title: { ar: 'من نحن', en: 'About Us' },
    subtitle: { ar: 'قصة شغف بالخشب والإبداع', en: 'A story of passion for wood and creativity' },
    story: { ar: 'قصتنا', en: 'Our Story' },
    storyText: {
      ar: 'بدأت رحلة ضرغام CNC من شغف عميق بفن النحت على الخشب في العراق.',
      en: 'Dorgham CNC began from a deep passion for wood carving art in Iraq.',
    },
    mission: { ar: 'مهمتنا', en: 'Our Mission' },
    missionText: {
      ar: 'تقديم تصاميم خشبية استثنائية تجمع بين الجمال والوظيفة.',
      en: 'To deliver exceptional wooden designs that blend beauty and functionality.',
    },
    vision: { ar: 'رؤيتنا', en: 'Our Vision' },
    visionText: {
      ar: 'أن نكون الخيار الأول لعشاق التصاميم الخشبية الفاخرة في العراق.',
      en: 'To be the first choice for premium wooden design enthusiasts in the region.',
    },
    image: DEFAULT_ABOUT_IMAGE,
    stats: [
      { value: '+500', label: { ar: 'مشروع منجز', en: 'Projects Done' } },
      { value: '+8', label: { ar: 'سنوات خبرة', en: 'Years Experience' } },
      { value: '98%', label: { ar: 'رضا العملاء', en: 'Client Satisfaction' } },
      { value: '+50', label: { ar: 'تصميم حصري', en: 'Exclusive Designs' } },
    ],
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
    managers: [],
    settings: {
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminPassword: DEFAULT_ADMIN_PASSWORD,
    },
  }
}
