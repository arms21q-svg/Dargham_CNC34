'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '../context/AppContext'

const MOBILE_NAV_ITEMS = [
  {
    path: '/',
    icon: 'home',
    label: { ar: 'الرئيسية', en: 'Home' },
  },
  {
    path: '/works',
    icon: 'works',
    label: { ar: 'أعمالنا', en: 'Works' },
  },
  {
    path: '/contact',
    icon: 'contact',
    label: { ar: 'تواصل', en: 'Contact' },
  },
  {
    path: '/saved',
    icon: 'saved',
    label: { ar: 'محفوظ', en: 'Saved' },
  },
] as const

function NavIcon({ name, active }: { name: (typeof MOBILE_NAV_ITEMS)[number]['icon']; active: boolean }) {
  const stroke = active ? 2 : 1.75
  return (
    <svg
      className="h-[22px] w-[22px]"
      viewBox="0 0 24 24"
      fill={active ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={stroke}
      aria-hidden
    >
      {name === 'home' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
        />
      )}
      {name === 'works' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 6a2 2 0 012-2h3l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
        />
      )}
      {name === 'contact' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5a2 2 0 012-2h2.2a1 1 0 01.96.73l1.1 3.3a1 1 0 01-.27 1.06L7.9 9.9a12 12 0 006.2 6.2l1.81-1.09a1 1 0 011.06-.27l3.3 1.1a1 1 0 01.73.96V19a2 2 0 01-2 2h-.5C10.6 21 3 13.4 3 5.5V5z"
        />
      )}
      {name === 'saved' && (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      )}
    </svg>
  )
}

export default function MobileBottomNav() {
  const { lang, savedIds } = useApp()
  const pathname = usePathname()
  const savedCount = savedIds.length
  const savedBadge = savedCount > 99 ? '99+' : String(savedCount)

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    if (path === '/works') return pathname === '/works' || pathname.startsWith('/works/')
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden"
      aria-label={lang === 'ar' ? 'التنقل السفلي' : 'Bottom navigation'}
    >
      <div
        className="w-full bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-6px_24px_rgba(0,0,0,0.08)]"
        style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      >
        <ul className="mx-auto grid h-[76px] w-full max-w-screen-sm grid-cols-4 items-stretch px-1">
          {MOBILE_NAV_ITEMS.map((page) => {
            const active = isActive(page.path)
            const showSavedBadge = page.icon === 'saved' && savedCount > 0
            return (
              <li key={page.path} className="min-w-0">
                <Link
                  href={page.path}
                  prefetch
                  aria-current={active ? 'page' : undefined}
                  aria-label={
                    showSavedBadge
                      ? lang === 'ar'
                        ? `محفوظ، ${savedCount}`
                        : `Saved, ${savedCount}`
                      : undefined
                  }
                  className={`flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center transition-colors ${
                    active ? 'text-[#b8961e]' : 'text-gray-500'
                  }`}
                >
                  <span
                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                      active ? 'bg-[#c9a227]/15' : ''
                    }`}
                  >
                    <NavIcon name={page.icon} active={active} />
                    {showSavedBadge ? (
                      <span
                        className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c9a227] px-1 text-[9px] font-bold leading-none text-black shadow-sm"
                        aria-hidden
                      >
                        {savedBadge}
                      </span>
                    ) : null}
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold leading-none tracking-tight">
                    {page.label[lang]}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
