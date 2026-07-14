'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import HeroSlider from '../components/HeroSlider'
import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

export default function HomePage() {
  const { lang, t } = useApp()
  const { siteData } = useSiteData()
  const featured = useMemo(
    () => siteData.products.filter((p) => p.featured).slice(0, 4),
    [siteData.products]
  )
  const home = siteData.home

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-stone-50 to-primary-50 dark:from-gray-950 dark:via-gray-900 dark:to-primary-950">
        <div className="pointer-events-none absolute -start-24 top-10 h-64 w-64 rounded-full bg-primary-200/30 blur-3xl dark:bg-primary-800/15" />

        <div className="container-main relative section-padding !pb-12 !pt-10 sm:!pt-14">
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12" dir="ltr">
            <div className="order-1">
              <HeroSlider side />
            </div>

            <div
              className="order-2"
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
              style={{ textAlign: lang === 'ar' ? 'right' : 'left' }}
            >
              <h1 className="mb-3 text-4xl font-extrabold leading-tight text-gray-900 dark:text-white sm:text-5xl lg:text-[3.25rem]">
                {home.heroTitle[lang]}
              </h1>

              <p className="mb-4 text-xl font-semibold text-primary-800 dark:text-primary-300 sm:text-2xl">
                {home.heroSubtitle[lang]}
              </p>

              <p className="mb-8 max-w-xl text-base leading-relaxed text-gray-700 dark:text-gray-300 sm:text-lg">
                {home.heroDesc[lang]}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href="/works" className="btn-primary min-w-[140px]">
                  {t.home.ourWorks}
                </Link>
                <Link href="/contact" className="btn-secondary min-w-[140px]">
                  {t.home.contactUs}
                </Link>
              </div>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {(lang === 'ar'
                  ? ['جداريات ونقوش دقيقة', 'أبواب وديكور مخصص', 'خامات طبيعية فاخرة', 'تسليم داخل العراق']
                  : ['Precise panels & carving', 'Custom doors & decor', 'Premium natural wood', 'Delivery across Iraq']
                ).map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-gray-800 dark:text-gray-100">{t.home.whyUs}</h2>
            <div className="mx-auto h-1 w-16 rounded-full bg-primary-500" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {t.home.whyUsItems.map((item, i) => (
              <div key={i} className="card p-6 text-center content-visibility-auto">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                  <span className="text-lg font-bold">{i + 1}</span>
                </div>
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-primary-50/50 dark:bg-primary-950/30">
        <div className="container-main">
          <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                {t.home.featuredWorks}
              </h2>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-400">{t.works.subtitle}</p>
            </div>
            <Link href="/works" className="btn-secondary">
              {t.home.viewAll} →
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-main text-center">
          <h2 className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-100">{t.contact.title}</h2>
          <p className="mx-auto mb-8 max-w-xl text-base text-gray-600 dark:text-gray-400">
            {t.contact.subtitle}
          </p>
          <Link href="/contact" className="btn-primary">
            {t.home.contactUs}
          </Link>
        </div>
      </section>
    </>
  )
}
