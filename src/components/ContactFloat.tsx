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
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px)+12px)] start-4 z-[60] flex flex-col items-start gap-3 sm:start-5 md:bottom-6"
    >
      {aiOpen && (
        <Suspense fallback={null}>
          <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
        </Suspense>
      )}

      {open && (links.length > 0 || aiEnabled) && (
        <div
          className="w-[min(calc(100vw-2rem),17rem)] overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-2xl shadow-black/15 dark:border-gray-700 dark:bg-gray-900 dark:shadow-black/40"
          style={{ animation: 'floatPanelIn 0.22s ease-out both' }}
        >
          <div className="border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 dark:border-gray-800">
            <p className="text-sm font-bold text-white">{panelTitle}</p>
            <p className="mt-0.5 text-xs text-emerald-50/90">
              {lang === 'ar' ? 'اختر طريقة التواصل' : 'Choose how to reach us'}
            </p>
          </div>

          <div className="flex flex-col gap-1 p-2">
            {links.map((link, index) => (
              <a
                key={link.id}
                href={getFloatLinkHref(link, contact, lang)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeAll}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                style={{ animation: `floatPop 0.24s ease-out ${index * 0.04}s both` }}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-md ${getFloatLinkColor(link.icon)}`}
                >
                  <FloatLinkIconSvg icon={link.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                  {link.label[lang]}
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-gray-400 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}

            {aiEnabled && (
              <button
                type="button"
                onClick={() => {
                  setAiOpen(true)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-gray-800 transition-colors hover:bg-gray-50 active:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700"
                style={{ animation: `floatPop 0.24s ease-out ${links.length * 0.04}s both` }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#141414] text-[#e8c547] shadow-md">
                  <AiIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">{aiLabel}</span>
                <svg
                  className="h-4 w-4 shrink-0 text-gray-400 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
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
        className={`group relative flex items-center gap-2.5 rounded-full border-2 border-white/90 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 text-white shadow-[0_8px_28px_rgba(16,185,129,0.45)] transition-all duration-200 hover:from-emerald-400 hover:to-emerald-600 hover:shadow-[0_10px_32px_rgba(16,185,129,0.55)] active:scale-[0.98] dark:border-gray-800/80 sm:px-5 sm:py-4 ${
          open ? 'ring-2 ring-emerald-300 ring-offset-2 ring-offset-white dark:ring-offset-gray-950' : 'animate-floatPulse'
        }`}
      >
        {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/30 animate-floatPing"
          />
        )}
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
          {open ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <ChatIcon className="h-5 w-5" />
          )}
        </span>
        <span className="relative text-sm font-bold tracking-wide sm:text-base">{open ? closeLabel : mainLabel}</span>
      </button>

      <style>{`
        @keyframes floatPop {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes floatPulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(16, 185, 129, 0.45); }
          50% { box-shadow: 0 8px 36px rgba(16, 185, 129, 0.65); }
        }
        @keyframes floatPing {
          0% { transform: scale(1); opacity: 0.55; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .animate-floatPulse {
          animation: floatPulse 2.4s ease-in-out infinite;
        }
        .animate-floatPing {
          animation: floatPing 2.4s ease-out infinite;
        }
      `}</style>
    </div>
  )
}
