import { seedProducts, slideImages, translations } from './content'
import { createDefaultCategories, LEGACY_CATEGORY_SLUG } from './defaultCategories'
import type { PortfolioCategory, Product, SiteData } from '../types/siteData'

export const DEFAULT_ADMIN_EMAIL = 'admin@dhirghamcnc.com'

export const DEFAULT_ABOUT_IMAGE =
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80'

/** Kept for DB/API compatibility; About page is no longer public. */
export function createDefaultAboutSettings(): SiteData['about'] {
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

function migrateSeedProducts(categories: PortfolioCategory[]): Product[] {
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))
  const counters = new Map<string, number>()

  return seedProducts.map((p) => {
    const slug = LEGACY_CATEGORY_SLUG[p.category] ?? categories[0]?.slug ?? 'decor'
    const categoryId = slugToId.get(slug) ?? categories[0]?.id ?? 'cat-decor'
    const next = (counters.get(categoryId) ?? 0) + 1
    counters.set(categoryId, next)

    return {
      id: p.id,
      categoryId,
      category: p.category,
      displayNumber: next,
      title: p.title,
      description: p.description,
      image: p.image,
      images: p.images,
      materials: p.materials,
      dimensions: p.dimensions,
      featured: p.featured ?? false,
      published: p.published !== false,
      colors: p.colors,
    }
  })
}

export function createDefaultSiteData(): SiteData {
  const ar = translations.ar
  const en = translations.en
  const categories = createDefaultCategories()

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
          en: 'Hello! I am Dorgham CNC assistant. Ask about our works, prices, or services.',
        },
      },
    },
    categories,
    products: migrateSeedProducts(categories),
    managers: [],
    settings: {
      adminEmail: DEFAULT_ADMIN_EMAIL,
      adminPassword: '',
    },
  }
}
