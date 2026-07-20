import type { Category, Product } from '../data/content'

export interface HomeSettings {
  heroTitle: { ar: string; en: string }
  heroSubtitle: { ar: string; en: string }
  heroDesc: { ar: string; en: string }
  slideImages: string[]
}

export interface AboutStat {
  value: string
  label: { ar: string; en: string }
}

export interface AboutSettings {
  title: { ar: string; en: string }
  subtitle: { ar: string; en: string }
  story: { ar: string; en: string }
  storyText: { ar: string; en: string }
  mission: { ar: string; en: string }
  missionText: { ar: string; en: string }
  vision: { ar: string; en: string }
  visionText: { ar: string; en: string }
  image: string
  stats: AboutStat[]
}

export interface ContactSettings {
  whatsapp: string
  facebook: string
  mapsUrl: string
  address: { ar: string; en: string }
  whatsappMessage: { ar: string; en: string }
  /** Optional direct fields used by social admin (also mirrored into floatLinks) */
  email?: string
  phone?: string
  instagram?: string
  tiktok?: string
  telegram?: string
  youtube?: string
  linkedin?: string
  floatLinks?: FloatLink[]
  aiAssistant?: AiAssistantSettings
}

export interface AiAssistantSettings {
  enabled: boolean
  welcomeMessage: { ar: string; en: string }
}

export type FloatLinkIcon =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'telegram'
  | 'linkedin'
  | 'maps'
  | 'website'
  | 'phone'
  | 'email'

export interface FloatLink {
  id: string
  label: { ar: string; en: string }
  url: string
  icon: FloatLinkIcon
  enabled: boolean
}

export interface Manager {
  id: string
  name: { ar: string; en: string }
  role: { ar: string; en: string }
  phone: string
  whatsapp?: string
}

export interface SiteSettings {
  adminEmail: string
  adminPassword: string
}

export interface SiteData {
  version: number
  updatedAt?: number
  home: HomeSettings
  about: AboutSettings
  contact: ContactSettings
  products: Product[]
  managers: Manager[]
  settings: SiteSettings
}

export type { Category, Product }
