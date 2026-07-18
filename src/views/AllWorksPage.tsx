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
    <div className="bg-black md:bg-transparent">
      <div className="section-padding !pt-6 md:!pt-10">
        <div className="container-main">
          <div className="mb-6 text-center md:mb-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:mb-3 md:text-4xl md:text-gray-800 dark:md:text-gray-100">
              {t.works.allWorks}
            </h1>
            <p className="hidden text-gray-500 md:block dark:text-gray-400">{t.works.subtitle}</p>
          </div>

          <div className="mb-5 md:mb-8">
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-[#141414] p-3 md:border-0 md:bg-white md:p-4 md:shadow-sm dark:md:bg-gray-900">
              <label className="mb-1.5 block text-xs font-medium text-white/70 md:text-sm md:text-gray-700 dark:md:text-gray-300">
                {t.works.search}
              </label>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.works.searchPlaceholder}
                className="input-field border-white/10 bg-black text-white placeholder:text-white/40 md:border-gray-200 md:bg-white md:text-gray-900 dark:md:border-gray-700 dark:md:bg-gray-950 dark:md:text-gray-100"
              />
            </div>
          </div>

          {search.trim() && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white md:bg-primary-50 md:text-primary-800 dark:md:bg-primary-950 dark:md:text-primary-200">
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

          <div className="mb-5 flex flex-wrap gap-2 md:mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:py-2 sm:text-sm ${
                  category === cat
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white/10 text-white/80 hover:bg-white/15 md:bg-gray-100 md:text-gray-600 md:hover:bg-gray-200 dark:md:bg-gray-800 dark:md:text-gray-300 dark:md:hover:bg-gray-700'
                }`}
              >
                {cat === 'all' ? t.works.filterAll : categoryLabels[lang][cat]}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-white/70 md:text-gray-500 dark:md:text-gray-400">
                {t.works.noResults}
              </p>
              {search.trim() && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-4 text-sm font-semibold text-primary-400 hover:underline md:text-primary-600"
                >
                  {lang === 'ar' ? 'مسح البحث' : 'Clear search'}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  catalogMobile
                  similarityScore={
                    search.trim() ? textScoresById.get(product.id) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
