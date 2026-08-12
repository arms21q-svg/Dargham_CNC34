'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SiteData, Manager, Product, PortfolioCategory } from '../types/siteData'
import type { HomeSettings, ContactSettings } from '../types/siteData'
import {
  createDefaultSiteData,
  DEFAULT_ADMIN_EMAIL,
} from '../data/defaultSiteData'
import {
  ADMIN_AUTH_KEY,
  getAuthToken,
  getAdminRole,
  isSuperAdminSession,
  isVercelHost,
  loadSiteData,
  loadSiteDataFresh,
  loginWithApi,
  mergePublishPayload,
  publishSiteData,
  purgeStaleClientCache,
  saveSiteDataLocal,
  setAdminRole,
  setAdminSessionCookie,
  setAuthToken,
} from '../utils/siteDataStorage'
import { readBootstrapSiteData, shouldApplyIncomingSiteData, resolveInitialSiteData } from '../utils/siteBootstrap'

interface SiteDataContextType {
  siteData: SiteData
  loading: boolean
  /** False until client restores admin session from storage (avoids login↔admin redirect loops). */
  authReady: boolean
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
  updateCategories: (categories: PortfolioCategory[]) => void
  addCategory: (category: PortfolioCategory) => void
  updateCategory: (category: PortfolioCategory) => void
  deleteCategory: (id: string) => void
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
    categories: patch.categories ?? prev.categories,
    managers: patch.managers ?? prev.managers,
  }
}

export function SiteDataProvider({
  children,
  initialSiteData = null,
}: {
  children: ReactNode
  initialSiteData?: SiteData | null
}) {
  const [siteData, setSiteData] = useState<SiteData>(() => {
    const boot = resolveInitialSiteData(initialSiteData)
    return boot ?? createDefaultSiteData()
  })
  const [loading, setLoading] = useState(() => !resolveInitialSiteData(initialSiteData))
  const [authReady, setAuthReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminRole, setAdminRoleState] = useState<string | null>(null)
  const skipLocalSaveRef = useRef(false)

  // Hydrate auth before children's useEffect redirects (layout effects run parent→… wait: child-first).
  // Parent useLayoutEffect still runs before child's useEffect, which stops the login↔admin loop.
  useLayoutEffect(() => {
    purgeStaleClientCache()

    const boot = readBootstrapSiteData()
    if (boot) {
      setSiteData((prev) => (shouldApplyIncomingSiteData(boot, prev) ? boot : prev))
      setLoading(false)
    }

    // JWT in sessionStorage is the source of truth for admin UI on production.
    const token = getAuthToken()
    const flagged = sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true'

    if (token) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true')
      setAdminSessionCookie(true)
      setIsAdmin(true)
      setAdminRoleState(getAdminRole())
    } else if (flagged && isVercelHost()) {
      sessionStorage.removeItem(ADMIN_AUTH_KEY)
      setAdminSessionCookie(false)
      setIsAdmin(false)
      setAdminRole(null)
      setAdminRoleState(null)
    } else if (flagged) {
      setIsAdmin(true)
      setAdminSessionCookie(true)
      setAdminRoleState(getAdminRole())
    } else {
      setIsAdmin(false)
      setAdminRoleState(null)
    }
    setAuthReady(true)
  }, [])

  useEffect(() => {
    let cancelled = false

    loadSiteData()
      .then((data) => {
        if (!cancelled) {
          setSiteData((prev) => (shouldApplyIncomingSiteData(data, prev) ? data : prev))
          saveSiteDataLocal(data)
        }
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
    if (!authReady || !isAdmin) return

    let cancelled = false
    loadSiteData()
      .then((data) => {
        if (!cancelled) {
          setSiteData(data)
          saveSiteDataLocal(data)
        }
      })
      .catch(() => {
        /* keep current */
      })

    return () => {
      cancelled = true
    }
  }, [authReady, isAdmin])

  useEffect(() => {
    if (loading) return
    const timer = window.setTimeout(() => {
      if (skipLocalSaveRef.current) return
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
      void loadSiteData()
        .then((fresh) => {
          setSiteData(fresh)
          saveSiteDataLocal(fresh)
        })
        .catch(() => {
          /* token session is valid; site data reload can finish in background */
        })
      return { ok: true }
    }

    // Offline login only in local development without Vercel/API
    if (process.env.NODE_ENV !== 'development' || isVercelHost()) {
      return {
        ok: false,
        error:
          apiResult.error ??
          'تعذر تسجيل الدخول عبر السيرفر. تحقق من الإنترنت وحاول مجدداً',
      }
    }

    const expectedEmail = (siteData.settings.adminEmail || DEFAULT_ADMIN_EMAIL)
      .trim()
      .toLowerCase()
    const expectedPassword = siteData.settings.adminPassword?.trim()
    const inputEmail = email.trim().toLowerCase()

    if (expectedPassword && inputEmail === expectedEmail && password === expectedPassword) {
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
    skipLocalSaveRef.current = true
    sessionStorage.removeItem(ADMIN_AUTH_KEY)
    setAuthToken(null)
    setAdminRole(null)
    setAdminSessionCookie(false)
    setIsAdmin(false)
    setAdminRoleState(null)

    void loadSiteData()
      .then((data) => {
        setSiteData(data)
        saveSiteDataLocal(data)
      })
      .finally(() => {
        skipLocalSaveRef.current = false
      })
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

  const updateCategories = useCallback((categories: PortfolioCategory[]) => {
    setSiteData((prev) => patchData(prev, { categories }))
  }, [])

  const addCategory = useCallback((category: PortfolioCategory) => {
    setSiteData((prev) => patchData(prev, { categories: [...prev.categories, category] }))
  }, [])

  const updateCategory = useCallback((category: PortfolioCategory) => {
    setSiteData((prev) =>
      patchData(prev, {
        categories: prev.categories.map((c) => (c.id === category.id ? category : c)),
      })
    )
  }, [])

  const deleteCategory = useCallback((id: string) => {
    setSiteData((prev) =>
      patchData(prev, {
        categories: prev.categories.filter((c) => c.id !== id),
        products: prev.products.filter((p) => p.categoryId !== id),
      })
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
    let payload = siteData
    if (getAuthToken()) {
      const fresh = await loadSiteDataFresh()
      payload = mergePublishPayload(siteData, fresh)
    }
    const result = await publishSiteData(payload)
    if (result.ok) {
      const fresh = await loadSiteDataFresh()
      setSiteData(fresh)
      saveSiteDataLocal(fresh)
    }
    return result
  }, [siteData])

  return (
    <SiteDataContext.Provider
      value={{
        siteData,
        loading,
        authReady,
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
        updateCategories,
        addCategory,
        updateCategory,
        deleteCategory,
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
