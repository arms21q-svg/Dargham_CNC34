'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import CategoryGrid, { CategoryGridSkeleton } from '../components/CategoryGrid'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import { publicCategories } from '../utils/categories'

export default function CategoriesPage() {
  const { lang, t } = useApp()
  const { siteData, loading } = useSiteData()
  const categories = useMemo(
    () => publicCategories(siteData.categories ?? []),
    [siteData.categories]
  )

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 md:text-4xl">
            {t.works.browseByCategory}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{t.works.subtitle}</p>
        </div>

        {loading ? (
          <CategoryGridSkeleton count={8} />
        ) : categories.length > 0 ? (
          <CategoryGrid categories={categories} lang={lang} />
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
        )}

        <div className="mt-10 text-center">
          <Link href="/works" className="btn-secondary">
            {t.works.imageSearchLink}
          </Link>
        </div>
      </div>
    </div>
  )
}
