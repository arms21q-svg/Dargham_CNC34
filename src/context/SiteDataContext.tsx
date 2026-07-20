'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { SiteData, Manager, Product } from '../types/siteData'
import type { HomeSettings, ContactSettings } from '../types/siteData'
import {
  createDefaultSiteData,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
} from '../data/defaultSiteData'
import {
  ADMIN_AUTH_KEY,
  getAuthToken,
  getAdminRole,
  isSuperAdminSession,
  isVercelHost,
  loadFromLocalStorageSync,
  loadSiteData,
  loginWithApi,
  publishSiteData,
  saveSiteDataLocal,
  setAdminRole,
  setAdminSessionCookie,
  setAuthToken,
} from '../utils/siteDataStorage'

interface SiteDataContextType {
  siteData: SiteData
  loading: boolean
  isAdmin: boolean
  adminRole: string | null
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  updateHome: (home: Partial<HomeSettings>) => void
  updateContact: (contact: Partial<ContactSettings>) => void
  updateProducts: (products: Product[]) => void
  addProduct: (product: Product) => void
  updateProduct: (product: Product) => void
  deleteProduct: (id: string) => void
  updateManagers: (managers: Manager[]) => void
  addManager: (manager: Manager) => void
  updateManager: (manager: Manager) => void
  deleteManager: (id: string) => void
  updateAdminPassword: (password: string) => void
  updateAdminEmail: (email: string) => void
  saveDraft: () => void
  publish: () => Promise<{ ok: boolean; message: string }>
}

const SiteDataContext = createContext<SiteDataContextType | null>(null)

function patchData(prev: SiteData, patch: Partial<SiteData>): SiteData {
  return {
    ...prev,
    ...patch,
    updatedAt: Date.now(),
    home: { ...prev.home, ...patch.home },
    about: {
      ...prev.about,
      ...patch.about,
      stats: patch.about?.stats ?? prev.about.stats,
    },
    contact: { ...prev.contact, ...patch.contact },
    settings: { ...prev.settings, ...patch.settings },
    products: patch.products ?? prev.products,
    managers: patch.managers ?? prev.managers,
  }
}

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const [siteData, setSiteData] = useState<SiteData>(() => createDefaultSiteData())
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRoleState] = useState<string | null>(null)

  useEffect(() => {
    const local = loadFromLocalStorageSync()
    if (local) setSiteData(local)

    const flagged = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true'
    if (flagged && isVercelHost() && !getAuthToken()) {
      sessionStorage.removeItem(ADMIN_AUTH_KEY)
      setAdminSessionCookie(false)
      setIsAdmin(false)
      setAdminRole(null)
      setAdminRoleState(null)
    } else {
      setIsAdmin(flagged)
      if (flagged) {
        setAdminSessionCookie(true)
        setAdminRoleState(getAdminRole())
      }
    }

    let cancelled = false

    loadSiteData()
      .then((data) => {
        if (!cancelled) setSiteData(data)
      })
      .catch(() => {
        /* keep local/defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loading) return
    const timer = window.setTimeout(() => {
      saveSiteDataLocal(siteData)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [siteData, loading])

  const login = useCallback(async (email: string, password: string) => {
    const apiResult = await loginWithApi(email, password)
    if (apiResult.ok) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true')
      setAdminSessionCookie(true)
      setIsAdmin(true)
      setAdminRoleState(apiResult.role ?? getAdminRole())
      const fresh = await loadSiteData()
      setSiteData(fresh)
      return { ok: true }
    }

    // On Vercel publishing requires an API JWT — never accept local-only login
    if (isVercelHost()) {
      return {
        ok: false,
        error:
          apiResult.error ??
          'تعذر تسجيل الدخول عبر السيرفر. تحقق من الإنترنت وحاول مجدداً',
      }
    }

    // fallback بدون قاعدة بيانات (تطوير / cPanel فقط)
    const expectedEmail = (siteData.settings.adminEmail || DEFAULT_ADMIN_EMAIL)
      .trim()
      .toLowerCase()
    const expectedPassword = siteData.settings.adminPassword || DEFAULT_ADMIN_PASSWORD
    const inputEmail = email.trim().toLowerCase()

    if (inputEmail === expectedEmail && password === expectedPassword) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true')
      setAdminSessionCookie(true)
      setAdminRole('super')
      setAdminRoleState('super')
      setIsAdmin(true)
      return { ok: true }
    }

    if (apiResult.useFallback) {
      return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
    }

    return { ok: false, error: apiResult.error ?? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' }
  }, [siteData.settings.adminEmail, siteData.settings.adminPassword])

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_AUTH_KEY)
    setAuthToken(null)
    setAdminRole(null)
    setAdminSessionCookie(false)
    setIsAdmin(false)
    setAdminRoleState(null)
  }, [])

  const updateHome = useCallback((home: Partial<HomeSettings>) => {
    setSiteData((prev) => patchData(prev, { home: { ...prev.home, ...home } }))
  }, [])

  const updateContact = useCallback((contact: Partial<ContactSettings>) => {
    setSiteData((prev) => patchData(prev, { contact: { ...prev.contact, ...contact } }))
  }, [])

  const updateProducts = useCallback((products: Product[]) => {
    setSiteData((prev) => patchData(prev, { products }))
  }, [])

  const addProduct = useCallback((product: Product) => {
    setSiteData((prev) => patchData(prev, { products: [...prev.products, product] }))
  }, [])

  const updateProduct = useCallback((product: Product) => {
    setSiteData((prev) =>
      patchData(prev, {
        products: prev.products.map((p) => (p.id === product.id ? product : p)),
      })
    )
  }, [])

  const deleteProduct = useCallback((id: string) => {
    setSiteData((prev) =>
      patchData(prev, { products: prev.products.filter((p) => p.id !== id) })
    )
  }, [])

  const updateManagers = useCallback((managers: Manager[]) => {
    setSiteData((prev) => patchData(prev, { managers }))
  }, [])

  const addManager = useCallback((manager: Manager) => {
    setSiteData((prev) => patchData(prev, { managers: [...prev.managers, manager] }))
  }, [])

  const updateManager = useCallback((manager: Manager) => {
    setSiteData((prev) =>
      patchData(prev, {
        managers: prev.managers.map((m) => (m.id === manager.id ? manager : m)),
      })
    )
  }, [])

  const deleteManager = useCallback((id: string) => {
    setSiteData((prev) =>
      patchData(prev, { managers: prev.managers.filter((m) => m.id !== id) })
    )
  }, [])

  const updateAdminPassword = useCallback((password: string) => {
    setSiteData((prev) => ({
      ...prev,
      settings: { ...prev.settings, adminPassword: password },
    }))
  }, [])

  const updateAdminEmail = useCallback((email: string) => {
    setSiteData((prev) => ({
      ...prev,
      settings: { ...prev.settings, adminEmail: email.trim().toLowerCase() },
    }))
  }, [])

  const saveDraft = useCallback(() => {
    saveSiteDataLocal(siteData)
  }, [siteData])

  const publish = useCallback(async () => {
    const result = await publishSiteData(siteData)
    if (result.ok) {
      setSiteData(result.data ?? { ...siteData, updatedAt: Date.now() })
    }
    return result
  }, [siteData])

  return (
    <SiteDataContext.Provider
      value={{
        siteData,
        loading,
        isAdmin,
        adminRole,
        isSuperAdmin: adminRole === 'super' || isSuperAdminSession(),
        login,
        logout,
        updateHome,
        updateContact,
        updateProducts,
        addProduct,
        updateProduct,
        deleteProduct,
        updateManagers,
        addManager,
        updateManager,
        deleteManager,
        updateAdminPassword,
        updateAdminEmail,
        saveDraft,
        publish,
      }}
    >
      {children}
    </SiteDataContext.Provider>
  )
}

export function useSiteData() {
  const ctx = useContext(SiteDataContext)
  if (!ctx) throw new Error('useSiteData must be used within SiteDataProvider')
  return ctx
}
