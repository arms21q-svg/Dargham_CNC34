import type { SiteData } from '../types/siteData'
import {
  createDefaultSiteData,
  DEFAULT_ADMIN_PASSWORD,
} from '../data/defaultSiteData'
import { apiUrl } from './apiBase'

export const SITE_DATA_KEY = 'dorgham-cnc-site-data'
export const ADMIN_AUTH_KEY = 'dorgham-cnc-admin-auth'
export const AUTH_TOKEN_KEY = 'dorgham-cnc-auth-token'

/** Static hosting (cPanel only) — Vercel does not run PHP. */
const STATIC_SAVE_ENDPOINT = apiUrl('/api/save-data.php')
/** Cold start on Vercel serverless can exceed 3s. */
const FETCH_TIMEOUT_MS = 30000

export function isVercelHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h.includes('vercel.app') || h.includes('dhirghamcnc.com')
}

/** Admin UI session without API JWT cannot publish on Vercel. */
export function hasPublishSession(): boolean {
  return Boolean(getAuthToken())
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string | null) {
  if (typeof window === 'undefined') return
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
  if (typeof window === 'undefined') return null
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

async function saveToStaticHosting(payload: SiteData): Promise<{
  ok: boolean
  message: string
  serverError?: boolean
} | null> {
  try {
    const res = await fetchWithTimeout(STATIC_SAVE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res) return null

    let json: { ok?: boolean; message?: string; error?: string } = {}
    try {
      json = (await res.json()) as typeof json
    } catch {
      if (res.status === 405 || res.status === 404) {
        return {
          ok: false,
          serverError: true,
          message:
            'السيرفر لا يقبل الحفظ — تأكد من رفع مجلد api وملف save-data.php مع صلاحيات كتابة لـ site-data.json',
        }
      }
      return null
    }

    if (res.ok && json.ok) {
      return { ok: true, message: json.message ?? 'تم النشر على الموقع بنجاح' }
    }

    if (res.status === 405 || res.status === 404) {
      return {
        ok: false,
        serverError: true,
        message:
          json.error ??
          'تعذر النشر — ارفع مجلد api من dist وتأكد أن PHP مفعّل على الاستضافة',
      }
    }
  } catch {
    return null
  }
  return null
}

export async function publishSiteData(
  data: SiteData
): Promise<{ ok: boolean; message: string; data?: SiteData }> {
  const payload: SiteData = { ...data, updatedAt: Date.now() }
  const token = getAuthToken()

  // Prevent giant base64 payloads from silently 500'ing on Vercel
  try {
    const estimated = JSON.stringify(payload).length
    if (estimated > 3_200_000) {
      return {
        ok: false,
        message:
          'حجم البيانات كبير جداً للنشر. استبدل الصور المرفوعة محلياً بروابط (URL)',
      }
    }
  } catch {
    // ignore stringify errors — API will validate
  }

  if (!token) {
    if (isVercelHost()) {
      return {
        ok: false,
        message:
          'لا توجد جلسة نشر — سجّل الخروج ثم الدخول مجدداً ثم اضغط «نشر على الموقع»',
      }
    }
  } else {
    try {
      const res = await fetchWithTimeout(apiUrl('/api/site-data'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res) {
        return {
          ok: false,
          message: 'انتهت مهلة الاتصال بالسيرفر — أعد المحاولة',
        }
      }

      let json: {
        ok?: boolean
        message?: string
        error?: string
        data?: SiteData
      } = {}
      try {
        json = (await res.json()) as typeof json
      } catch {
        return {
          ok: false,
          message: `فشل النشر (رمز ${res.status}) — أعد المحاولة`,
        }
      }

      if (res.ok && json.ok) {
        const saved = json.data ?? payload
        saveSiteDataLocal(saved)
        return {
          ok: true,
          message: json.message ?? 'تم النشر على قاعدة البيانات',
          data: saved,
        }
      }

      if (res.status === 401) {
        setAuthToken(null)
        return { ok: false, message: 'انتهت الجلسة. سجّل الدخول مجدداً' }
      }

      return {
        ok: false,
        message: json.error ?? `فشل النشر على السيرفر (${res.status})`,
      }
    } catch {
      return { ok: false, message: 'تعذر الاتصال بالسيرفر أثناء النشر' }
    }
  }

  const saved = saveSiteDataLocal(payload)
  if (!saved) {
    return {
      ok: false,
      message: 'تعذر الحفظ — حجم البيانات كبير. استخدم روابط صور',
    }
  }

  // PHP only works on cPanel/Apache — skip dead 405 calls on Vercel
  if (!isVercelHost()) {
    const staticSave = await saveToStaticHosting(payload)
    if (staticSave?.ok) {
      return { ...staticSave, data: payload }
    }
    if (staticSave?.serverError) {
      return { ok: false, message: staticSave.message }
    }

    downloadSiteData(payload)
    return {
      ok: true,
      message:
        'تم الحفظ محلياً فقط — لم يُرفع على السيرفر. حمّل site-data.json أو فعّل PHP',
      data: payload,
    }
  }

  return {
    ok: false,
    message:
      'لا توجد جلسة نشر — سجّل الخروج ثم الدخول مجدداً ثم اضغط «نشر على الموقع»',
  }
}

export function normalizeWhatsAppPhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  // رقم عراقي محلي مثل 07xxxxxxxx → 9647xxxxxxxx
  if (digits.startsWith('0') && digits.length >= 10) {
    digits = `964${digits.slice(1)}`
  }
  return digits
}

export function getWhatsAppUrl(
  contact: SiteData['contact'],
  lang: 'ar' | 'en',
  customText?: string
) {
  const phone = normalizeWhatsAppPhone(contact.whatsapp)
  const text = encodeURIComponent(customText ?? contact.whatsappMessage[lang] ?? '')
  if (!phone) return 'https://wa.me/?text=' + text
  return `https://api.whatsapp.com/send?phone=${phone}&text=${text}`
}

export function openWhatsApp(url: string) {
  if (typeof window === 'undefined') return
  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  // بعض المتصفحات تمنع النوافذ المنبثقة من زر النموذج
  if (!opened || opened.closed || typeof opened.closed === 'undefined') {
    window.location.assign(url)
  }
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
