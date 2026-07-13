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

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(LANG_KEY)
    return stored === 'en' ? 'en' : 'ar'
  })

  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(SAVED_KEY)
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch {
      return []
    }
  })

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
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  }, [lang, isDark])

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
