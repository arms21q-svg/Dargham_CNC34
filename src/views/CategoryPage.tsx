'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import DirectionalArrow from '../components/DirectionalArrow'
import WorksCatalogGrid, { WorksCatalogSkeleton } from '../components/WorksCatalogGrid'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import {
  categoryTitle,
  getCategoryBySlug,
  productsInCategory,
  publicCategories,
} from '../utils/categories'
import { publicProducts } from '../utils/publicProducts'

const PAGE_SIZE = 12

export default function CategoryPage() {
  const params = useParams()
  const slug = typeof params?.slug === 'string' ? params.slug : ''
  const { lang, t } = useApp()
  const { siteData, loading } = useSiteData()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [slug])

  const category = useMemo(
    () => getCategoryBySlug(siteData.categories ?? [], slug),
    [siteData.categories, slug]
  )

  const works = useMemo(() => {
    if (!category) return []
    return productsInCategory(publicProducts(siteData.products), category.id)
  }, [category, siteData.products])

  const visibleWorks = useMemo(() => works.slice(0, visibleCount), [works, visibleCount])
  const hasMore = visibleCount < works.length

  const description = category?.description?.[lang]?.trim()

  if (!loading && !category) {
    return (
      <div className="section-padding text-center">
        <p className="text-lg text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
        <Link href="/categories" className="btn-primary mt-4">
          {t.common.back}
        </Link>
      </div>
    )
  }

  const title = categoryTitle(category, lang)

  return (
    <div className="section-padding">
      <div className="container-main">
        <Link
          href="/categories"
          className="btn-ghost group mb-6 inline-flex items-center gap-1.5"
          prefetch
        >
          <DirectionalArrow direction="back" />
          {t.works.browseByCategory}
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 md:text-4xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">{description}</p>
          ) : null}
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {works.length} {t.works.resultsCount}
          </p>
        </div>

        {loading ? (
          <WorksCatalogSkeleton count={6} />
        ) : works.length > 0 ? (
          <>
            <WorksCatalogGrid products={visibleWorks} desktopCols={4} />
            {hasMore ? (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                >
                  {lang === 'ar' ? 'عرض المزيد' : 'Show more'}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
        )}

        {publicCategories(siteData.categories ?? []).length > 1 && category && (
          <div className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
              {t.works.otherCategories}
            </h2>
            <div className="flex flex-wrap gap-2">
              {publicCategories(siteData.categories ?? [])
                .filter((c) => c.id !== category.id)
                .map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-primary-950"
                  >
                    {categoryTitle(c, lang)}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
