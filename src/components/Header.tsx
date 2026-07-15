'use client'

import { memo, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useApp } from '../context/AppContext'
import { PUBLIC_PAGES } from '../data/publicPages'

function Header() {
  const { lang, setLang, t, isDark, toggleTheme } = useApp()
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  const links = PUBLIC_PAGES.map((page) => ({
    to: page.path,
    label: t.nav[page.navKey],
  }))

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/'
    if (path === '/works') return pathname === '/works'
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-surface-dark/90">
      <div className="container-main flex items-center justify-between gap-2 px-3 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2" prefetch>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
            D
          </div>
          <span className="hidden text-lg font-bold text-primary-700 dark:text-primary-300 sm:inline">
            {lang === 'ar' ? 'ضرغام CNC' : 'Dorgham CNC'}
          </span>
        </Link>

        <nav
          className="hidden max-w-full flex-1 flex-wrap items-center justify-center gap-0.5 md:flex"
          aria-label={lang === 'ar' ? 'القائمة الرئيسية' : 'Main menu'}
        >
          {links.map((link) => (
            <Link
              key={link.to}
              href={link.to}
              prefetch
              className={`rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-200 lg:px-3 lg:text-sm ${
                isActive(link.to)
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:text-gray-300 dark:hover:bg-gray-800/60 dark:hover:text-primary-400'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button type="button" onClick={toggleTheme} className="btn-ghost !p-2" aria-label="Toggle theme">
            {isDark ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="btn-ghost !px-3 !py-2 text-sm font-semibold"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="btn-ghost !p-2 md:hidden"
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="animate-fade-in border-t border-gray-100 px-4 py-4 md:hidden dark:border-gray-800"
          aria-label={lang === 'ar' ? 'قائمة الموبايل' : 'Mobile menu'}
        >
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                href={link.to}
                prefetch
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-4 py-3 font-medium transition-colors duration-200 ${
                  isActive(link.to)
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}

export default memo(Header)
