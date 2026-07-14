'use client'

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
    <div ref={rootRef} className="fixed bottom-5 start-5 z-50 flex flex-col items-center gap-3">
      {aiOpen && (
        <Suspense fallback={null}>
          <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </Suspense>
      )}

      {/* Circular link stack — neat, round buttons only */}
      {open && links.length > 0 && (
        <div className="flex flex-col items-center gap-3">
          {links.map((link, index) => (
            <a
              key={link.id}
              href={getFloatLinkHref(link, contact, lang)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              title={link.label[lang]}
              aria-label={link.label[lang]}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 ${getFloatLinkColor(link.icon)}`}
              style={{
                animation: `floatPop 0.28s ease-out ${index * 0.05}s both`,
              }}
            >
              <FloatLinkIconSvg icon={link.icon} className="h-5 w-5" />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        {aiEnabled && (
          <button
            type="button"
            onClick={() => {
              setAiOpen((value) => !value)
              setOpen(false)
            }}
            aria-expanded={aiOpen}
            aria-label={aiLabel}
            title={aiLabel}
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-xl text-white shadow-lg shadow-violet-600/35 transition-all hover:scale-105 active:scale-95 ${
              aiOpen ? 'ring-2 ring-violet-300 ring-offset-2 dark:ring-offset-gray-950' : ''
            }`}
          >
            ✨
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
            aria-label={linksLabel}
            title={linksLabel}
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/40 transition-all hover:scale-105 hover:bg-primary-700 active:scale-95 ${
              open ? 'ring-2 ring-primary-300 ring-offset-2 dark:ring-offset-gray-950' : ''
            }`}
          >
            {open ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes floatPop {
          from { opacity: 0; transform: translateY(10px) scale(0.8); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
