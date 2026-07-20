'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import HeroSlider from '../components/HeroSlider'
import WorksCatalogGrid, { WorksCatalogSkeleton } from '../components/WorksCatalogGrid'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import { publicProducts } from '../utils/publicProducts'

export default function HomePage() {
  const { lang, t } = useApp()
  const { siteData, loading } = useSiteData()
  const featured = useMemo(
    () => publicProducts(siteData.products).filter((p) => p.featured),
    [siteData.products]
  )
  const home = siteData.home
  const showFeatured = loading || featured.length > 0

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
            </div>
          </div>
        </div>
      </section>

      {showFeatured && (
        <section className="section-padding bg-black md:bg-primary-50/50 dark:md:bg-primary-950/30">
          <div className="container-main">
            <div className="mb-6 md:mb-10">
              <h2 className="text-3xl font-bold text-white md:text-gray-800 dark:md:text-gray-100">
                {t.home.featuredWorks}
              </h2>
              <p className="mt-2 hidden text-base text-gray-600 md:block dark:text-gray-400">
                {t.works.subtitle}
              </p>
            </div>

            {loading ? (
              <WorksCatalogSkeleton count={4} desktopCols={4} />
            ) : (
              <WorksCatalogGrid products={featured} desktopCols={4} />
            )}

            <div className="mt-8 text-center">
              <Link href="/works/all" className="btn-secondary">
                {t.works.allWorks} →
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
