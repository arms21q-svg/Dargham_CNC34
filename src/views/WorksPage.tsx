'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '../components/ProductCard'
import { searchProductsByText } from '../utils/productTextSearch'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

export default function WorksPage() {
  const { lang, t } = useApp()
  const { siteData } = useSiteData()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')

  const textHits = useMemo(
    () => searchProductsByText(siteData.products, search, lang),
    [siteData.products, search, lang]
  )

  const textScoresById = useMemo(() => {
    const map = new Map<string, number>()
    for (const hit of textHits) {
      if (hit.score > 0) map.set(hit.product.id, hit.score)
    }
    return map
  }, [textHits])

  const filtered = useMemo(
    () => (search.trim() ? textHits.map((h) => h.product) : siteData.products),
    [siteData.products, search, textHits]
  )

  const showTextScores = Boolean(search.trim())

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">{t.works.title}</h1>
          <p className="mx-auto max-w-2xl text-gray-500 dark:text-gray-400">{t.works.subtitle}</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <div className="mb-8">
          <div className="card mx-auto max-w-2xl p-4">
            <label className="form-label" htmlFor="works-text-search">
              {t.works.search}
            </label>
            <input
              id="works-text-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.works.searchPlaceholder}
              className="input-field"
              autoComplete="off"
            />
          </div>
        </div>

        {search.trim() && (
          <div className="mb-6 rounded-2xl bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-950 dark:text-primary-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {lang === 'ar'
                  ? `نتائج البحث عن «${search.trim()}»`
                  : `Results for “${search.trim()}”`}
              </span>
              <span className="font-semibold">
                {filtered.length} {t.works.resultsCount}
              </span>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {search.trim()
              ? lang === 'ar'
                ? 'نتائج البحث'
                : 'Search results'
              : t.works.allWorks}
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-4 text-sm font-semibold text-primary-600 hover:underline"
              >
                {lang === 'ar' ? 'مسح البحث' : 'Clear search'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                similarityScore={
                  showTextScores ? textScoresById.get(product.id) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
