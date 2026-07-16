'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '../components/ProductCard'
import { categoryLabels, type Category } from '../data/content'
import { searchProductsByText } from '../utils/productTextSearch'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

const categories: (Category | 'all')[] = [
  'all',
  'wallArt',
  'furniture',
  'decor',
  'doors',
  'panels',
  'custom',
]

export default function AllWorksPage() {
  const { lang, t } = useApp()
  const { siteData } = useSiteData()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [category, setCategory] = useState<Category | 'all'>('all')

  const textHits = useMemo(() => {
    const base =
      category === 'all'
        ? siteData.products
        : siteData.products.filter((p) => p.category === category)
    return searchProductsByText(base, search, lang)
  }, [siteData.products, category, search, lang])

  const textScoresById = useMemo(() => {
    const map = new Map<string, number>()
    for (const hit of textHits) {
      if (hit.score > 0) map.set(hit.product.id, hit.score)
    }
    return map
  }, [textHits])

  const filtered = useMemo(() => {
    if (search.trim()) return textHits.map((h) => h.product)
    return category === 'all'
      ? siteData.products
      : siteData.products.filter((p) => p.category === category)
  }, [siteData.products, category, search, textHits])

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {t.works.allWorks}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t.works.subtitle}</p>
        </div>

        <div className="mb-8">
          <div className="card mx-auto max-w-2xl p-4">
            <label className="form-label">{t.works.search}</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.works.searchPlaceholder}
              className="input-field"
            />
          </div>
        </div>

        {search.trim() && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-950 dark:text-primary-200">
            <span>
              {lang === 'ar'
                ? `نتائج البحث عن «${search.trim()}»`
                : `Results for “${search.trim()}”`}
            </span>
            <span className="font-semibold">
              {filtered.length} {t.works.resultsCount}
            </span>
          </div>
        )}

        <div className="mb-8 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                category === cat
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {cat === 'all' ? t.works.filterAll : categoryLabels[lang][cat]}
            </button>
          ))}
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
                  search.trim() ? textScoresById.get(product.id) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
