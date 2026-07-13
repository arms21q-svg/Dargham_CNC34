import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import {
  FloatLinkIconSvg,
  getFloatLinkColor,
  getFloatLinkHref,
  normalizeFloatLinks,
} from '../utils/floatLinks'

const AiChatPanel = lazy(() => import('./AiChatPanel'))

export default function ContactFloat() {
  const { lang } = useApp()
  const { siteData } = useSiteData()
  const { contact } = siteData
  const [open, setOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const aiEnabled = contact.aiAssistant?.enabled ?? true
  const linksLabel = lang === 'ar' ? 'المواقع' : 'Links'
  const aiLabel = lang === 'ar' ? 'مساعد ذكي' : 'AI Chat'

  const links = normalizeFloatLinks(contact, contact.floatLinks).filter((link) => {
    if (!link.enabled) return false
    const href = getFloatLinkHref(link, contact, lang)
    return href !== '#'
  })

  useEffect(() => {
    if (!open && !aiOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false)
        setAiOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, aiOpen])

  if (links.length === 0 && !aiEnabled) return null

  return (
    <div ref={rootRef} className="fixed bottom-5 start-5 z-50 flex flex-col items-start gap-3">
      {aiOpen && (
        <Suspense fallback={null}>
          <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </Suspense>
      )}

      {open && links.length > 0 && (
        <div className="w-[min(92vw,260px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 bg-primary-600 px-4 py-2.5 text-sm font-bold text-white dark:border-gray-800">
            {lang === 'ar' ? 'تواصل معنا' : 'Contact us'}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {links.map((link) => (
              <a
                key={link.id}
                href={getFloatLinkHref(link, contact, lang)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${getFloatLinkColor(link.icon)}`}
                >
                  <FloatLinkIconSvg icon={link.icon} className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {link.label[lang]}
                </span>
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {aiEnabled && (
          <button
            type="button"
            onClick={() => {
              setAiOpen((value) => !value)
              setOpen(false)
            }}
            aria-expanded={aiOpen}
            className={`flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/40 transition-all hover:scale-[1.02] active:scale-95 ${
              aiOpen ? 'ring-2 ring-violet-300 ring-offset-2 dark:ring-offset-gray-950' : 'animate-pulse-soft'
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              ✨
            </span>
            {aiLabel}
          </button>
        )}

        {links.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setOpen((value) => !value)
              setAiOpen(false)
            }}
            aria-expanded={open}
            className={`flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/40 transition-all hover:scale-[1.02] hover:bg-primary-700 active:scale-95 ${
              open ? 'ring-2 ring-primary-300 ring-offset-2 dark:ring-offset-gray-950' : ''
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              {open ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              )}
            </span>
            {linksLabel}
          </button>
        )}
      </div>
    </div>
  )
}
