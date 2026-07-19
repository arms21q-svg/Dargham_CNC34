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

function AiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

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

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false)
        setAiOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [open, aiOpen])

  if (links.length === 0 && !aiEnabled) return null

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px)+12px)] start-4 z-[60] flex flex-col items-center gap-2.5 sm:start-5 md:bottom-5"
    >
      {aiOpen && (
        <Suspense fallback={null}>
          <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </Suspense>
      )}

      {open && links.length > 0 && (
        <div className="flex flex-col items-center gap-2.5">
          {links.map((link, index) => (
            <a
              key={link.id}
              href={getFloatLinkHref(link, contact, lang)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              title={link.label[lang]}
              aria-label={link.label[lang]}
              className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-transform duration-200 hover:scale-105 active:scale-95 ${getFloatLinkColor(link.icon)}`}
              style={{
                animation: `floatPop 0.28s ease-out ${index * 0.05}s both`,
              }}
            >
              <FloatLinkIconSvg icon={link.icon} className="h-5 w-5" />
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-col items-center gap-2.5">
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
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#141414] text-[#e8c547] shadow-md transition-transform hover:scale-105 active:scale-95 ${
              aiOpen ? 'ring-2 ring-[#c9a227] ring-offset-2 ring-offset-white' : ''
            }`}
          >
            <AiIcon className="h-6 w-6" />
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
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-md transition-transform hover:scale-105 hover:bg-primary-700 active:scale-95 ${
              open ? 'ring-2 ring-primary-300 ring-offset-2 ring-offset-white' : ''
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
