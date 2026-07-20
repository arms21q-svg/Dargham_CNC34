'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import WorksCatalogGrid from '../components/WorksCatalogGrid'
import WorksSearchBar, { type WorksImageSearchResult } from '../components/WorksSearchBar'
import WorksSearchResultCard from '../components/WorksSearchResultCard'
import { categoryLabels, type Category, type Product } from '../data/content'
import { searchProductsByText } from '../utils/productTextSearch'
import { publicProducts } from '../utils/publicProducts'
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
  const [imageSearch, setImageSearch] = useState<WorksImageSearchResult | null>(null)

  const catalog = useMemo(() => publicProducts(siteData.products), [siteData.products])

  const catalogBase = useMemo(() => {
    return category === 'all' ? catalog : catalog.filter((p) => p.category === category)
  }, [catalog, category])

  const textHits = useMemo(
    () => searchProductsByText(catalogBase, search, lang),
    [catalogBase, search, lang]
  )

  const textScoresById = useMemo(() => {
    const map = new Map<string, number>()
    for (const hit of textHits) {
      if (hit.score > 0) map.set(hit.product.id, hit.score)
    }
    return map
  }, [textHits])

  const imageScoresById = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of imageSearch?.matches ?? []) {
      map.set(m.id, m.score)
    }
    return map
  }, [imageSearch])

  const imageResults = useMemo(() => {
    if (!imageSearch?.productIds.length) return [] as Product[]
    const byId = new Map(catalog.map((p) => [p.id, p]))
    return imageSearch.productIds
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p))
  }, [imageSearch, catalog])

  const filtered = useMemo(() => {
    if (imageSearch) return imageResults
    if (search.trim()) return textHits.map((h) => h.product)
    return catalogBase
  }, [imageSearch, imageResults, search, textHits, catalogBase])

  const isImageMode = Boolean(imageSearch)

  return (
    <div className="bg-black md:bg-transparent">
      <div className="section-padding !pt-6 md:!pt-10">
        <div className="container-main">
          <div className="mb-6 text-center md:mb-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:mb-3 md:text-4xl md:text-gray-800 dark:md:text-gray-100">
              {t.nav.works}
            </h1>
            <p className="hidden text-gray-500 md:block dark:text-gray-400">{t.works.subtitle}</p>
          </div>

          <div className="mb-5 md:mb-8">
            <WorksSearchBar
              search={search}
              onSearchChange={setSearch}
              imageSearch={imageSearch}
              onImageResult={setImageSearch}
              onClearImage={() => setImageSearch(null)}
            />
          </div>

          {(search.trim() || imageSearch) && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm text-white md:bg-primary-50 md:text-primary-800 dark:md:bg-primary-950 dark:md:text-primary-200">
              <span>
                {imageSearch
                  ? lang === 'ar'
                    ? 'نتائج من قاعدة البيانات — أعمال مشابهة'
                    : 'Database results — similar works'
                  : lang === 'ar'
                    ? `نتائج البحث عن «${search.trim()}»`
                    : `Results for “${search.trim()}”`}
              </span>
              <span className="font-semibold">
                {filtered.length} {t.works.resultsCount}
              </span>
            </div>
          )}

          {!isImageMode && (
            <div className="mb-5 flex flex-wrap gap-2 md:mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setCategory(cat)
                    setImageSearch(null)
                  }}
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
          )}

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-white/70 md:text-gray-500 dark:md:text-gray-400">
                {t.works.noResults}
              </p>
              {(search.trim() || imageSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setImageSearch(null)
                  }}
                  className="mt-4 text-sm font-semibold text-primary-400 hover:underline md:text-primary-600"
                >
                  {t.works.clearResults}
                </button>
              )}
            </div>
          ) : isImageMode ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((product) => (
                <WorksSearchResultCard
                  key={product.id}
                  product={product}
                  score={imageScoresById.get(product.id)}
                />
              ))}
            </div>
          ) : (
            <WorksCatalogGrid
              products={filtered}
              similarityScores={textScoresById}
              searchActive={Boolean(search.trim())}
            />
          )}
        </div>
      </div>
    </div>
  )
}
