import type { SiteData } from '../types/siteData'
import {
  createDefaultSiteData,
  DEFAULT_ADMIN_EMAIL,
} from '../data/defaultSiteData'
import { stripHeavyEmbeddedMedia } from './lightSiteData'
import { apiUrl } from './apiBase'

export const SITE_DATA_KEY = 'dorgham-cnc-site-data'
export const SITE_DATA_VERSION_KEY = 'dorgham-cnc-data-version'
export const ADMIN_AUTH_KEY = 'dorgham-cnc-admin-auth'
export const AUTH_TOKEN_KEY = 'dorgham-cnc-auth-token'
export const ADMIN_ROLE_KEY = 'dorgham-cnc-admin-role'

/** Static hosting (cPanel only) — Vercel does not run PHP. */
const STATIC_SAVE_ENDPOINT = apiUrl('/api/save-data.php')
/** Publish can take longer with many products; keep under Vercel maxDuration. */
const FETCH_TIMEOUT_MS = 55_000
const LOGIN_TIMEOUT_MS = 20_000
const MAX_PUBLISH_CHARS = 3_200_000

export function countEmbeddedImages(data: SiteData): number {
  let count = 0
  const check = (value?: string) => {
    if (value?.startsWith('data:')) count += 1
  }
  for (const url of data.home?.slideImages ?? []) check(url)
  check(data.about?.image)
  for (const product of data.products ?? []) {
    check(product.image)
    for (const url of product.images ?? []) check(url)
  }
  return count
}

export function estimateSiteDataSize(data: SiteData): number {
  try {
    return JSON.stringify(data).length
  } catch {
    return Number.MAX_SAFE_INTEGER
  }
}

export function isVercelHost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h.includes('vercel.app') || h.includes('dhirghamcnc.com')
}

/** After deploy: drop stale site cache + unregister legacy service workers. */
export function purgeStaleClientCache() {
  if (typeof window === 'undefined') return

  const buildId = process.env.NEXT_PUBLIC_BUILD_ID ?? ''
  if (buildId) {
    const stored = localStorage.getItem(SITE_DATA_VERSION_KEY)
    if (stored !== buildId) {
      localStorage.removeItem(SITE_DATA_KEY)
      localStorage.setItem(SITE_DATA_VERSION_KEY, buildId)
    }
  }

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister()
    })
  }

  if ('caches' in window) {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        if (/dorgham|site-data|workbox|precache/i.test(key)) void caches.delete(key)
      }
    })
  }
}

/** Admin UI session without API JWT cannot publish on Vercel. */
export function hasPublishSession(): boolean {
  return Boolean(getAuthToken())
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(AUTH_TOKEN_KEY)
}

export const ADMIN_SESSION_COOKIE = 'dorgham_admin_session'

export function setAdminSessionCookie(active: boolean) {
  if (typeof document === 'undefined') return
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  if (active) {
    document.cookie = `${ADMIN_SESSION_COOKIE}=1; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${secure}`
  } else {
    document.cookie = `${ADMIN_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
  }
}

export function setAuthToken(token: string | null): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, token)
      setAdminSessionCookie(true)
    } else {
      sessionStorage.removeItem(AUTH_TOKEN_KEY)
      sessionStorage.removeItem(ADMIN_ROLE_KEY)
      setAdminSessionCookie(false)
    }
    return true
  } catch {
    return false
  }
}

export function setAdminRole(role: string | null) {
  if (typeof window === 'undefined') return
  if (role) sessionStorage.setItem(ADMIN_ROLE_KEY, role)
  else sessionStorage.removeItem(ADMIN_ROLE_KEY)
}

export function getAdminRole(): string | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem(ADMIN_ROLE_KEY)
  if (stored) return stored

  const token = getAuthToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string }
    if (payload.role) {
      sessionStorage.setItem(ADMIN_ROLE_KEY, payload.role)
      return payload.role
    }
  } catch {
    /* ignore */
  }
  return null
}

export function getAdminEmailFromToken(): string | null {
  if (typeof window === 'undefined') return null
  const token = getAuthToken()
  if (!token) return null
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { email?: string }
    const email = payload.email?.trim().toLowerCase()
    return email || null
  } catch {
    return null
  }
}

export function isSuperAdminSession(): boolean {
  return getAdminRole() === 'super'
}

export function mergeSiteData(base: SiteData, patch: Partial<SiteData>): SiteData {
  return {
    ...base,
    ...patch,
    home: { ...base.home, ...patch.home },
    about: { ...base.about, ...patch.about, stats: patch.about?.stats ?? base.about.stats },
    contact: { ...base.contact, ...patch.contact },
    settings: { ...base.settings, ...patch.settings },
    products: patch.products ?? base.products,
    categories: patch.categories ?? base.categories,
    managers: patch.managers ?? base.managers,
  }
}

function pickNewest(...candidates: SiteData[]): SiteData {
  return candidates.reduce((best, cur) =>
    (cur.updatedAt ?? 0) >= (best.updatedAt ?? 0) ? cur : best
  )
}

/** Admin publish needs embedded base64; public clients use /api/.../image proxy URLs. */
function normalizeClientSiteData(result: SiteData, defaults: SiteData): SiteData {
  const merged = preserveAdminCredentials(result, [defaults, result])
  if (getAuthToken()) return merged
  return stripHeavyEmbeddedMedia(merged)
}

function isProxyProductImage(url: string | undefined): boolean {
  return Boolean(url?.startsWith('/api/products/'))
}

function isProxySlideImage(url: string | undefined): boolean {
  return Boolean(url?.startsWith('/api/site/slides/'))
}

/** Restore DB media when the admin UI still holds public proxy URLs from bootstrap. */
export function mergePublishPayload(local: SiteData, stored: SiteData): SiteData {
  const storedById = new Map(stored.products.map((p) => [p.id, p]))
  const products = local.products.map((p) => {
    const db = storedById.get(p.id)
    if (!db) return p

    let image = p.image
    let images = p.images ?? []

    const localImageMissing = !p.image?.trim() || isProxyProductImage(p.image)
    if (localImageMissing && db.image?.trim() && !isProxyProductImage(db.image)) {
      image = db.image
    }

    const galleryProxy =
      images.length === 0 || images.every((u) => !u || isProxyProductImage(u))
    if (galleryProxy && db.images?.some((u) => u && !isProxyProductImage(u))) {
      images = db.images
    } else {
      images = images.map((u, i) => {
        const storedUrl = db.images?.[i]
        if (isProxyProductImage(u) && storedUrl && !isProxyProductImage(storedUrl)) {
          return storedUrl
        }
        return u
      })
    }

    return { ...p, image, images }
  })

  const slideImages = (local.home?.slideImages ?? []).map((url, index) => {
    const storedUrl = stored.home?.slideImages?.[index]
    const localSlideMissing = !url?.trim() || isProxySlideImage(url)
    if (localSlideMissing && storedUrl?.trim() && !isProxySlideImage(storedUrl)) {
      return storedUrl
    }
    return url
  })

  return {
    ...local,
    products,
    home: { ...local.home, slideImages },
  }
}

function preserveAdminCredentials(result: SiteData, candidates: SiteData[]): SiteData {
  const emailFromResult = result.settings.adminEmail?.trim()
  const emailFromToken = getAdminEmailFromToken()
  const emailSource = candidates.find((c) => c.settings.adminEmail?.trim())
  const adminEmail =
    emailFromResult ||
    emailFromToken ||
    emailSource?.settings.adminEmail?.trim() ||
    (getAuthToken() ? '' : DEFAULT_ADMIN_EMAIL)

  return {
    ...result,
    settings: {
      ...result.settings,
      adminEmail: adminEmail || DEFAULT_ADMIN_EMAIL,
      // Keep empty unless this client session explicitly set a draft password
      adminPassword: result.settings.adminPassword?.trim() || '',
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

async function loadFromApi(defaults: SiteData, fresh = false): Promise<SiteData | null> {
  const token = getAuthToken()
  const qs = fresh ? '?fresh=1' : ''
  const res = await fetchWithTimeout(apiUrl(`/api/site-data${qs}`), {
    cache: token || fresh ? 'no-store' : 'default',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
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
  const res = await fetchWithTimeout(`/site-data.json?v=${Date.now()}`, {
    cache: 'no-store',
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
 * Prefer live API data; use static JSON / localStorage only as offline fallback.
 */
export async function loadSiteData(): Promise<SiteData> {
  const defaults = createDefaultSiteData()

  const apiData = await loadFromApi(defaults)
  if (apiData) {
    return normalizeClientSiteData(apiData, defaults)
  }

  // Production: never show stale offline copies when the live API is unreachable
  if (isVercelHost()) {
    return defaults
  }

  const localData = loadFromLocalStorage(defaults)
  const jsonData = await loadFromJson(defaults)
  const candidates = [jsonData, localData].filter((data): data is SiteData => data !== null)

  if (candidates.length === 0) return defaults

  return preserveAdminCredentials(pickNewest(...candidates), [defaults, ...candidates])
}

/** Force-read from DB (bypass server cache) — use right after publish. */
export async function loadSiteDataFresh(): Promise<SiteData> {
  const defaults = createDefaultSiteData()
  const apiData = await loadFromApi(defaults, true)
  if (apiData) {
    return normalizeClientSiteData(apiData, defaults)
  }
  return loadSiteData()
}

export function saveSiteDataLocal(data: SiteData) {
  try {
    const draft = {
      ...data,
      updatedAt: data.updatedAt ?? Date.now(),
      settings: {
        ...data.settings,
        adminPassword: data.settings.adminPassword?.trim() || '',
      },
    }
    const payload = getAuthToken() ? draft : stripHeavyEmbeddedMedia(draft)

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
): Promise<{ ok: boolean; error?: string; useFallback?: boolean; role?: string }> {
  try {
    const loginId = email.trim().toLowerCase()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)
    let res: Response | null = null
    try {
      res = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: loginId, username: loginId, password }),
        signal: controller.signal,
      })
    } catch {
      res = null
    } finally {
      clearTimeout(timer)
    }
    if (!res) {
      return { ok: false, useFallback: true, error: 'تعذر الاتصال بالسيرفر' }
    }

    let json: {
      ok?: boolean
      token?: string
      error?: string
      user?: { role?: string }
    } = {}
    try {
      json = (await res.json()) as typeof json
    } catch {
      return { ok: false, useFallback: true, error: 'تعذر الاتصال بالسيرفر' }
    }

    if (res.ok && json.ok && json.token) {
      if (!setAuthToken(json.token)) {
        return {
          ok: false,
          error:
            'تعذر حفظ جلسة الدخول في المتصفح. جرّب نافذة عادية (ليس وضع التصفّح الخاص) أو متصفحاً آخر.',
        }
      }
      const role = json.user?.role ?? 'admin'
      setAdminRole(role)
      return { ok: true, role }
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
  const token = getAuthToken()
  // Never send a password via general publish — credentials use /api/auth/update-credentials.
  const payload: SiteData = {
    ...data,
    updatedAt: Date.now(),
    settings: {
      ...data.settings,
      adminPassword: '',
    },
  }

  // Prevent giant base64 payloads from silently 500'ing on Vercel
  const embeddedCount = countEmbeddedImages(payload)
  try {
    const estimated = JSON.stringify(payload).length
    if (estimated > MAX_PUBLISH_CHARS) {
      return {
        ok: false,
        message:
          embeddedCount > 0
            ? `حجم البيانات كبير جداً (${embeddedCount} صورة مرفوعة محلياً). استبدلها بروابط URL ثم أعد النشر`
            : 'حجم البيانات كبير جداً للنشر. استبدل الصور المرفوعة محلياً بروابط (URL)',
      }
    }
    if (estimated > 2_400_000 && embeddedCount > 0) {
      // Soft warning path still attempts publish — server may finish under new timeout.
      console.warn('[publish] large payload', { estimated, embeddedCount })
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
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res) {
        return {
          ok: false,
          message:
            embeddedCount > 0
              ? 'انتهت مهلة النشر — الصور المرفوعة من الجهاز تبطّئ الحفظ. استبدلها بروابط URL ثم أعد المحاولة'
              : 'انتهت مهلة الاتصال بالسيرفر — أعد المحاولة',
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
          payload.email.trim() ? `البريد: ${payload.email.trim()}` : null,
          payload.phone.trim() ? `الهاتف: ${payload.phone.trim()}` : null,
          '',
          `الرسالة:\n${payload.message}`,
        ]
      : [
          'Hello,',
          'I would like to contact you via your website:',
          '',
          `Name: ${payload.name}`,
          payload.email.trim() ? `Email: ${payload.email.trim()}` : null,
          payload.phone.trim() ? `Phone: ${payload.phone.trim()}` : null,
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
