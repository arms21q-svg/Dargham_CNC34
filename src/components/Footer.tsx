'use client'

import Link from 'next/link'
import { useApp } from '../context/AppContext'
import { PUBLIC_PAGES } from '../data/publicPages'
import SocialLinks from './SocialLinks'

export default function Footer() {
  const { lang, t } = useApp()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="container-main section-padding !py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <img
                src="/logo.png"
                alt={lang === 'ar' ? 'ضرغام CNC' : 'Dorgham CNC'}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
              />
              <span className="text-lg font-bold text-primary-700 dark:text-primary-300">
                {lang === 'ar' ? 'ضرغام CNC' : 'Dorgham CNC'}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.footer.tagline}</p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-gray-200">
              {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h3>
            <div className="flex flex-col gap-2">
              <Link href="/works" className="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400">
                {t.nav.works}
              </Link>
              <Link href="/contact" className="text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400">
                {t.nav.contact}
              </Link>
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-gray-800 dark:text-gray-200">
              {t.contact.followUs}
            </h3>
            <SocialLinks />
          </div>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
          <nav
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-gray-400"
            aria-label={lang === 'ar' ? 'صفحات الموقع' : 'Site pages'}
          >
            {PUBLIC_PAGES.map((page) => (
              <Link
                key={page.path}
                href={page.path}
                className="hover:text-primary-600 dark:hover:text-primary-400"
              >
                {t.nav[page.navKey]}
              </Link>
            ))}
          </nav>
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            © {year} {lang === 'ar' ? 'ضرغام CNC' : 'Dorgham CNC'}. {t.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}
