import type { Manager as DbManager, Product as DbProduct, SiteConfig } from '@prisma/client'
import { createDefaultAboutSettings } from '../src/data/defaultSiteData'
import type { AboutSettings, FloatLink, SiteData } from '../src/types/siteData'

function parseAbout(raw: unknown): AboutSettings {
  const defaults = createDefaultAboutSettings()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults

  const o = raw as Partial<AboutSettings>
  const bilingual = (
    field: keyof Omit<AboutSettings, 'image' | 'stats'>,
    fallback: { ar: string; en: string }
  ) => ({
    ar: typeof o[field]?.ar === 'string' ? o[field]!.ar : fallback.ar,
    en: typeof o[field]?.en === 'string' ? o[field]!.en : fallback.en,
  })

  const stats =
    Array.isArray(o.stats) && o.stats.length > 0
      ? o.stats.map((s, i) => ({
          value: typeof s?.value === 'string' ? s.value : defaults.stats[i]?.value ?? '',
          label: {
            ar: typeof s?.label?.ar === 'string' ? s.label.ar : defaults.stats[i]?.label.ar ?? '',
            en: typeof s?.label?.en === 'string' ? s.label.en : defaults.stats[i]?.label.en ?? '',
          },
        }))
      : defaults.stats

  return {
    title: bilingual('title', defaults.title),
    subtitle: bilingual('subtitle', defaults.subtitle),
    story: bilingual('story', defaults.story),
    storyText: bilingual('storyText', defaults.storyText),
    mission: bilingual('mission', defaults.mission),
    missionText: bilingual('missionText', defaults.missionText),
    vision: bilingual('vision', defaults.vision),
    visionText: bilingual('visionText', defaults.visionText),
    image: typeof o.image === 'string' && o.image.trim() ? o.image : defaults.image,
    stats,
  }
}

function parseFloatLinks(raw: unknown, config: SiteConfig): FloatLink[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as FloatLink[]
  }

  return [
    {
      id: 'whatsapp',
      label: { ar: 'واتساب', en: 'WhatsApp' },
      url: '',
      icon: 'whatsapp',
      enabled: true,
    },
    {
      id: 'facebook',
      label: { ar: 'فيسبوك', en: 'Facebook' },
      url: config.facebook,
      icon: 'facebook',
      enabled: true,
    },
    {
      id: 'maps',
      label: { ar: 'الموقع', en: 'Location' },
      url: config.mapsUrl,
      icon: 'maps',
      enabled: true,
    },
  ]
}
export function toSiteData(
  config: SiteConfig,
  products: DbProduct[],
  managers: DbManager[]
): SiteData {
  return {
    version: config.version,
    updatedAt: config.updatedAt.getTime(),
    home: {
      heroTitle: { ar: config.heroTitleAr, en: config.heroTitleEn },
      heroSubtitle: { ar: config.heroSubtitleAr, en: config.heroSubtitleEn },
      heroDesc: { ar: config.heroDescAr, en: config.heroDescEn },
      slideImages: config.slideImages,
    },
    about: parseAbout(config.about),
    contact: {
      whatsapp: config.whatsapp,
      facebook: config.facebook,
      mapsUrl: config.mapsUrl,
      address: { ar: config.addressAr, en: config.addressEn },
      whatsappMessage: { ar: config.whatsappMsgAr, en: config.whatsappMsgEn },
      floatLinks: parseFloatLinks(config.floatLinks, config),
      aiAssistant: {
        enabled: config.aiEnabled,
        welcomeMessage: {
          ar: config.aiWelcomeAr,
          en: config.aiWelcomeEn,
        },
      },
    },
    products: products.map((p) => ({
      id: p.id,
      title: { ar: p.titleAr, en: p.titleEn },
      description: { ar: p.descriptionAr, en: p.descriptionEn },
      category: p.category as SiteData['products'][0]['category'],
      image: p.image,
      materials: { ar: p.materialsAr, en: p.materialsEn },
      dimensions: { ar: p.dimensionsAr, en: p.dimensionsEn },
      featured: p.featured,
      colors: p.colors,
    })),
    managers: managers.map((m) => ({
      id: m.id,
      name: { ar: m.nameAr, en: m.nameEn },
      role: { ar: m.roleAr, en: m.roleEn },
      phone: m.phone,
      whatsapp: m.whatsapp ?? undefined,
    })),
    settings: {
      adminEmail: config.adminEmail,
      adminPassword: '',
    },
  }
}

export function configFromSiteData(data: SiteData, passwordHash: string) {
  const home = data.home
  const contact = data.contact
  const settings = data.settings
  const ai = contact.aiAssistant
  const about = parseAbout(data.about)

  return {
    version: data.version ?? 1,
    heroTitleAr: home?.heroTitle?.ar ?? '',
    heroTitleEn: home?.heroTitle?.en ?? '',
    heroSubtitleAr: home?.heroSubtitle?.ar ?? '',
    heroSubtitleEn: home?.heroSubtitle?.en ?? '',
    heroDescAr: home?.heroDesc?.ar ?? '',
    heroDescEn: home?.heroDesc?.en ?? '',
    slideImages: Array.isArray(home?.slideImages) ? home.slideImages.filter(Boolean) : [],
    whatsapp: contact?.whatsapp ?? '',
    facebook: contact?.facebook ?? '',
    mapsUrl: contact?.mapsUrl ?? '',
    addressAr: contact?.address?.ar ?? '',
    addressEn: contact?.address?.en ?? '',
    whatsappMsgAr: contact?.whatsappMessage?.ar ?? '',
    whatsappMsgEn: contact?.whatsappMessage?.en ?? '',
    floatLinks: JSON.parse(
      JSON.stringify(Array.isArray(contact?.floatLinks) ? contact.floatLinks : [])
    ) as object[],
    about: JSON.parse(JSON.stringify(about)) as object,
    aiEnabled: ai?.enabled ?? true,
    aiWelcomeAr:
      ai?.welcomeMessage?.ar ??
      'مرحباً! أنا مساعد ضرغام CNC. اسألني عن أعمالنا وخدماتنا.',
    aiWelcomeEn:
      ai?.welcomeMessage?.en ??
      'Hello! I am Dorgham CNC assistant. Ask about our works and services.',
    adminEmail: (settings?.adminEmail ?? '').trim().toLowerCase(),
    adminPasswordHash: passwordHash,
  }
}

export function productFromSiteData(p: SiteData['products'][0], index: number) {
  return {
    id: String(p.id || `product-${index + 1}`),
    titleAr: p.title?.ar ?? '',
    titleEn: p.title?.en ?? '',
    descriptionAr: p.description?.ar ?? '',
    descriptionEn: p.description?.en ?? '',
    category: p.category || 'decor',
    image: p.image ?? '',
    materialsAr: p.materials?.ar ?? '',
    materialsEn: p.materials?.en ?? '',
    dimensionsAr: p.dimensions?.ar ?? '',
    dimensionsEn: p.dimensions?.en ?? '',
    featured: Boolean(p.featured),
    colors: Array.isArray(p.colors) ? p.colors : [],
    sortOrder: index,
  }
}

export function managerFromSiteData(m: SiteData['managers'][0], index: number) {
  return {
    id: String(m.id || `manager-${index + 1}`),
    nameAr: m.name?.ar ?? '',
    nameEn: m.name?.en ?? '',
    roleAr: m.role?.ar ?? '',
    roleEn: m.role?.en ?? '',
    phone: m.phone ?? '',
    whatsapp: m.whatsapp ?? null,
    sortOrder: index,
  }
}
