import type { SiteData } from '../types/siteData'
import {
  createDefaultSiteData,
  DEFAULT_ADMIN_PASSWORD,
} from '../data/defaultSiteData'
import { apiUrl } from './apiBase'

export const SITE_DATA_KEY = 'dorgham-cnc-site-data'
export const ADMIN_AUTH_KEY = 'dorgham-cnc-admin-auth'
export const AUTH_TOKEN_KEY = 'dorgham-cnc-auth-token'

const LEGACY_SAVE_ENDPOINTS = [apiUrl('/api/save-data'), apiUrl('/api/save-data.php')]
const FETCH_TIMEOUT_MS = 3200

export function getAuthToken(): string | null {
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null) {
  if (token) sessionStorage.setItem(AUTH_TOKEN_KEY, token)
  else sessionStorage.removeItem(AUTH_TOKEN_KEY)
}

export function mergeSiteData(base: SiteData, patch: Partial<SiteData>): SiteData {
  return {
    ...base,
    ...patch,
    home: { ...base.home, ...patch.home },
    contact: { ...base.contact, ...patch.contact },
    settings: { ...base.settings, ...patch.settings },
    products: patch.products ?? base.products,
    managers: patch.managers ?? base.managers,
  }
}

function pickNewest(...candidates: SiteData[]): SiteData {
  return candidates.reduce((best, cur) =>
    (cur.updatedAt ?? 0) >= (best.updatedAt ?? 0) ? cur : best
  )
}

function preserveAdminCredentials(result: SiteData, candidates: SiteData[]): SiteData {
  if (result.settings.adminPassword) return result

  const source = candidates.find((c) => c.settings.adminPassword)
  const adminPassword = source?.settings.adminPassword || DEFAULT_ADMIN_PASSWORD
  const adminEmail = result.settings.adminEmail || source?.settings.adminEmail

  return {
    ...result,
    settings: {
      ...result.settings,
      adminEmail: adminEmail || result.settings.adminEmail,
      adminPassword,
    },
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function loadFromApi(defaults: SiteData): Promise<SiteData | null> {
  const res = await fetchWithTimeout(apiUrl('/api/site-data'))
  if (!res?.ok) return null
  try {
    const json = (await res.json()) as { ok: boolean; data: SiteData }
    if (json.ok && json.data) {
      return mergeSiteData(defaults, json.data)
    }
  } catch {
    // ignore
  }
  return null
}

async function loadFromJson(defaults: SiteData): Promise<SiteData | null> {
  // No cache-bust — allow CDN/browser cache of site-data.json
  const res = await fetchWithTimeout('/site-data.json', {
    headers: { Accept: 'application/json' },
  })
  if (!res?.ok) return null
  try {
    return mergeSiteData(defaults, (await res.json()) as SiteData)
  } catch {
    return null
  }
}

export function loadFromLocalStorageSync(defaults?: SiteData): SiteData | null {
  const base = defaults ?? createDefaultSiteData()
  try {
    const stored = localStorage.getItem(SITE_DATA_KEY)
    if (!stored) return null
    return mergeSiteData(base, JSON.parse(stored) as SiteData)
  } catch {
    return null
  }
}

function loadFromLocalStorage(defaults: SiteData): SiteData | null {
  return loadFromLocalStorageSync(defaults)
}

/**
 * Stale-while-revalidate style loader:
 * Prefer API, then static JSON, then localStorage — without parallel waste on mobile.
 */
export async function loadSiteData(): Promise<SiteData> {
  const defaults = createDefaultSiteData()
  const localData = loadFromLocalStorage(defaults)

  const apiData = await loadFromApi(defaults)
  if (apiData) {
    return preserveAdminCredentials(apiData, [defaults, localData, apiData].filter(Boolean) as SiteData[])
  }

  const jsonData = await loadFromJson(defaults)
  const candidates = [jsonData, localData].filter((data): data is SiteData => data !== null)

  if (candidates.length === 0) return defaults

  return preserveAdminCredentials(pickNewest(...candidates), [defaults, ...candidates])
}

export function saveSiteDataLocal(data: SiteData) {
  try {
    const payload = { ...data, updatedAt: data.updatedAt ?? Date.now() }

    if (!payload.settings.adminPassword) {
      try {
        const stored = localStorage.getItem(SITE_DATA_KEY)
        if (stored) {
          const prev = JSON.parse(stored) as SiteData
          if (prev.settings.adminPassword) {
            payload.settings = {
              ...payload.settings,
              adminPassword: prev.settings.adminPassword,
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (!payload.settings.adminPassword) {
      payload.settings = {
        ...payload.settings,
        adminPassword: DEFAULT_ADMIN_PASSWORD,
      }
    }

    localStorage.setItem(SITE_DATA_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function downloadSiteData(data: SiteData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'site-data.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export async function loginWithApi(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string; useFallback?: boolean }> {
  try {
    const res = await fetchWithTimeout(apiUrl('/api/auth/login'), {      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res) {
      return { ok: false, useFallback: true, error: 'تعذر الاتصال بالسيرفر' }
    }

    let json: { ok?: boolean; token?: string; error?: string } = {}
    try {
      json = (await res.json()) as typeof json
    } catch {
      return { ok: false, useFallback: true, error: 'تعذر الاتصال بالسيرفر' }
    }

    if (res.ok && json.ok && json.token) {
      setAuthToken(json.token)
      return { ok: true }
    }

    const useFallback = res.status >= 500 || res.status === 404 || res.status === 503
    return {
      ok: false,
      useFallback,
      error: json.error ?? 'فشل تسجيل الدخول',
    }
  } catch {
    return { ok: false, useFallback: true, error: 'تعذر الاتصال بالسيرفر' }
  }
}

async function saveToLegacyEndpoints(payload: SiteData): Promise<{ ok: boolean; message: string } | null> {
  for (const endpoint of LEGACY_SAVE_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res?.ok) continue
      const json = (await res.json()) as { ok?: boolean; message?: string }
      if (json.ok) {
        return { ok: true, message: json.message ?? 'تم الحفظ والنشر بنجاح' }
      }
    } catch {
      // try next
    }
  }
  return null
}

export async function publishSiteData(
  data: SiteData
): Promise<{ ok: boolean; message: string; data?: SiteData }> {
  const payload: SiteData = { ...data, updatedAt: Date.now() }
  const token = getAuthToken()

  if (token) {
    try {
      const res = await fetchWithTimeout(apiUrl('/api/site-data'), {        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (res) {
        const json = (await res.json()) as {
          ok: boolean
          message?: string
          error?: string
          data?: SiteData
        }

        if (res.ok && json.ok) {
          const saved = json.data ?? payload
          saveSiteDataLocal(saved)
          return {
            ok: true,
            message: json.message ?? 'تم النشر على قاعدة البيانات Supabase',
            data: saved,
          }
        }

        if (res.status === 401) {
          setAuthToken(null)
          return { ok: false, message: 'انتهت الجلسة. سجّل الدخول مجدداً' }
        }
      }
    } catch {
      // fall through to local publish
    }
  }

  const saved = saveSiteDataLocal(payload)
  if (!saved) {
    return {
      ok: false,
      message: 'تعذر الحفظ — حجم البيانات كبير. استخدم روابط صور',
    }
  }

  const legacy = await saveToLegacyEndpoints(payload)
  if (legacy) {
    return { ...legacy, data: payload }
  }

  downloadSiteData(payload)
  return {
    ok: true,
    message: 'تم الحفظ محلياً — التغييرات تظهر فوراً في هذا المتصفح',
    data: payload,
  }
}

export function getWhatsAppUrl(
  contact: SiteData['contact'],
  lang: 'ar' | 'en',
  customText?: string
) {
  const phone = contact.whatsapp.replace(/\D/g, '')
  const text = encodeURIComponent(customText ?? contact.whatsappMessage[lang])
  return `https://wa.me/${phone}?text=${text}`
}

export interface ContactFormPayload {
  name: string
  email: string
  phone: string
  message: string
}

export function buildContactWhatsAppMessage(
  payload: ContactFormPayload,
  lang: 'ar' | 'en'
): string {
  const lines =
    lang === 'ar'
      ? [
          'السلام عليكم،',
          'أرغب بالتواصل معكم عبر الموقع:',
          '',
          `الاسم: ${payload.name}`,
          `البريد: ${payload.email}`,
          payload.phone ? `الهاتف: ${payload.phone}` : null,
          '',
          `الرسالة:\n${payload.message}`,
        ]
      : [
          'Hello,',
          'I would like to contact you via your website:',
          '',
          `Name: ${payload.name}`,
          `Email: ${payload.email}`,
          payload.phone ? `Phone: ${payload.phone}` : null,
          '',
          `Message:\n${payload.message}`,
        ]

  return lines.filter(Boolean).join('\n')
}

export function getContactFormWhatsAppUrl(
  contact: SiteData['contact'],
  lang: 'ar' | 'en',
  payload: ContactFormPayload
) {
  return getWhatsAppUrl(contact, lang, buildContactWhatsAppMessage(payload, lang))
}
