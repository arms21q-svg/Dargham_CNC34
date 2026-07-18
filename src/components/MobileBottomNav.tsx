'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '../context/AppContext'
import { PUBLIC_PAGES } from '../data/publicPages'

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 'currentColor' : 'currentColor'
  const common = {
    className: 'h-5 w-5',
    fill: active ? 'currentColor' : 'none',
    viewBox: '0 0 24 24',
    stroke,
    strokeWidth: active ? 0 : 1.8,
  } as const

  switch (name) {
    case 'home':
      return (
        <svg {...common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10.5 12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"
            fill={active ? 'currentColor' : 'none'}
          />
        </svg>
      )
    case 'works':
      return (
        <svg {...common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6a2 2 0 012-2h3l2 2h7a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"
            fill={active ? 'currentColor' : 'none'}
          />
        </svg>
      )
    case 'contact':
      return (
        <svg {...common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 5a2 2 0 012-2h2.2a1 1 0 01.96.73l1.1 3.3a1 1 0 01-.27 1.06L7.9 9.9a12 12 0 006.2 6.2l1.81-1.09a1 1 0 011.06-.27l3.3 1.1a1 1 0 01.73.96V19a2 2 0 01-2 2h-.5C10.6 21 3 13.4 3 5.5V5z"
            fill={active ? 'currentColor' : 'none'}
          />
        </svg>
      )
    case 'saved':
      return (
        <svg {...common} fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            fill={active ? 'currentColor' : 'none'}
          />
        </svg>
      )
    default:
      return null
  }
}

const ICON_BY_KEY: Record<string, string> = {
  home: 'home',
  works: 'works',
  contact: 'contact',
  saved: 'saved',
}

export default function MobileBottomNav() {
  const { lang, t } = useApp()
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    if (path === '/works') return pathname === '/works' || pathname.startsWith('/works/')
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden dark:border-gray-800 dark:bg-surface-dark/95"
      aria-label={lang === 'ar' ? 'التنقل السفلي' : 'Bottom navigation'}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4 px-1 pt-1.5">
        {PUBLIC_PAGES.map((page) => {
          const active = isActive(page.path)
          const icon = ICON_BY_KEY[page.navKey] ?? 'home'
          return (
            <li key={page.path}>
              <Link
                href={page.path}
                prefetch
                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                    active ? 'bg-primary-50 dark:bg-primary-950' : ''
                  }`}
                >
                  <NavIcon name={icon} active={active} />
                </span>
                <span className="truncate">{t.nav[page.navKey]}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
