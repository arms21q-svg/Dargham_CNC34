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

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const panelTitle = lang === 'ar' ? 'تواصل معنا' : 'Contact us'
  const mainLabel = lang === 'ar' ? 'تواصل' : 'Contact'
  const aiLabel = lang === 'ar' ? 'مساعد ذكي' : 'AI Chat'
  const closeLabel = lang === 'ar' ? 'إغلاق' : 'Close'

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

  const closeAll = () => {
    setOpen(false)
    setAiOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px)+10px)] start-3 z-[60] flex flex-col items-start gap-2 sm:start-4 md:bottom-5"
    >
      {aiOpen && (
        <Suspense fallback={null}>
          <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </Suspense>
      )}

      {open && (links.length > 0 || aiEnabled) && (
        <div
          className="w-[min(calc(100vw-1.5rem),14.5rem)] overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-lg shadow-black/10 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/30"
          style={{ animation: 'floatPanelIn 0.2s ease-out both' }}
        >
          <div className="border-b border-gray-100 bg-emerald-600 px-3 py-2 dark:border-gray-800">
            <p className="text-xs font-bold text-white">{panelTitle}</p>
          </div>

          <div className="flex flex-col gap-0.5 p-1.5">
            {links.map((link, index) => (
              <a
                key={link.id}
                href={getFloatLinkHref(link, contact, lang)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeAll}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                style={{ animation: `floatPop 0.2s ease-out ${index * 0.03}s both` }}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${getFloatLinkColor(link.icon)}`}
                >
                  <FloatLinkIconSvg icon={link.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-xs font-semibold leading-snug">
                  {link.label[lang]}
                </span>
              </a>
            ))}

            {aiEnabled && (
              <button
                type="button"
                onClick={() => {
                  setAiOpen(true)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                style={{ animation: `floatPop 0.2s ease-out ${links.length * 0.03}s both` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#141414] text-[#e8c547] shadow-sm">
                  <AiIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-xs font-semibold leading-snug">{aiLabel}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (open) {
            closeAll()
            return
          }
          setOpen(true)
          setAiOpen(false)
        }}
        aria-expanded={open}
        aria-label={open ? closeLabel : mainLabel}
        title={open ? closeLabel : mainLabel}
        className={`flex h-11 items-center gap-1.5 rounded-full border border-white/80 bg-emerald-600 px-3 text-white shadow-md shadow-emerald-600/30 transition-all duration-200 hover:bg-emerald-500 active:scale-95 dark:border-gray-800/80 ${
          open ? 'ring-2 ring-emerald-300/80 ring-offset-1 ring-offset-white dark:ring-offset-gray-950' : ''
        }`}
      >
        {open ? (
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <ChatIcon className="h-4 w-4 shrink-0" />
        )}
        <span className="text-xs font-bold">{open ? closeLabel : mainLabel}</span>
      </button>

      <style>{`
        @keyframes floatPop {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatPanelIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
