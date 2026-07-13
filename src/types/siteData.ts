import type { Category, Product } from '../data/content'

export interface HomeSettings {
  heroTitle: { ar: string; en: string }
  heroSubtitle: { ar: string; en: string }
  heroDesc: { ar: string; en: string }
  slideImages: string[]
}

export interface ContactSettings {
  whatsapp: string
  facebook: string
  mapsUrl: string
  address: { ar: string; en: string }
  whatsappMessage: { ar: string; en: string }
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
  | 'maps'
  | 'website'
  | 'phone'

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
  contact: ContactSettings
  products: Product[]
  managers: Manager[]
  settings: SiteSettings
}

export type { Category, Product }
