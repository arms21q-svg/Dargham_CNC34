'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Lang } from '../data/content'
import { translations } from '../data/content'

interface AppContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (typeof translations)['ar']
  isDark: boolean
  toggleTheme: () => void
  savedIds: string[]
  toggleSave: (id: string) => void
  isSaved: (id: string) => boolean
}

const AppContext = createContext<AppContextType | null>(null)

const SAVED_KEY = 'dorgham-cnc-saved'
const THEME_KEY = 'dorgham-cnc-theme'
const LANG_KEY = 'dorgham-cnc-lang'

function readLang(): Lang {
  if (typeof window === 'undefined') return 'ar'
  return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ar'
}

function readDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = localStorage.getItem(THEME_KEY)
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readSavedIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(SAVED_KEY)
    return stored ? (JSON.parse(stored) as string[]) : []
  } catch {
    return []
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar')
  const [isDark, setIsDark] = useState(false)
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setLangState(readLang())
    setIsDark(readDark())
    setSavedIds(readSavedIds())
    setHydrated(true)
  }, [])

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    localStorage.setItem(LANG_KEY, newLang)
    document.documentElement.lang = newLang
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
      return next
    })
  }, [])

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
      localStorage.setItem(SAVED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [lang, isDark, hydrated])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: translations[lang],
      isDark,
      toggleTheme,
      savedIds,
      toggleSave,
      isSaved,
    }),
    [lang, setLang, isDark, toggleTheme, savedIds, toggleSave, isSaved]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
