'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProductCard from '../components/ProductCard'
import type { ImageSearchResult } from '../components/ImageSearch'
import { categoryLabels, type Category } from '../data/content'
import { IMAGE_SEARCH_FILTERS, productMatchesFilter } from '../data/imageSearchFilters'
import { findSimilarProducts } from '../utils/imageSearch'
import { searchProductsByText } from '../utils/productTextSearch'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

const ImageSearch = dynamic(() => import('../components/ImageSearch'), {
  ssr: false,
  loading: () => (
    <div className="h-40 animate-pulse rounded-2xl bg-primary-50 dark:bg-primary-950/40" />
  ),
})

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
  const [imageSearch, setImageSearch] = useState<ImageSearchResult | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

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

  const scoresById = useMemo(() => {
    const map = new Map<string, number>()
    if (!imageSearch) return map

    for (const m of imageSearch.matches ?? []) {
      map.set(m.id, m.score)
    }

    const hasStrongVisual = [...map.values()].some((s) => s >= 90)
    if (imageSearch.colors.length && !hasStrongVisual) {
      for (const item of findSimilarProducts(imageSearch.colors, siteData.products, 50)) {
        if (!map.has(item.product.id)) map.set(item.product.id, item.score)
      }
    }

    return map
  }, [imageSearch, siteData.products])

  const filtered = useMemo(() => {
    let result = search.trim()
      ? textHits.map((h) => h.product)
      : category === 'all'
        ? siteData.products
        : siteData.products.filter((p) => p.category === category)

    const analysisTags = [
      ...(imageSearch?.analysis?.tags ?? []),
      ...(imageSearch?.analysis?.materials ?? []),
      ...(imageSearch?.analysis?.techniques ?? []),
    ]

    if (imageSearch) {
      if (imageSearch.productIds.length > 0) {
        const idOrder = new Map(imageSearch.productIds.map((id, i) => [id, i]))
        const aiMatches = result
          .filter((p) => idOrder.has(p.id))
          .sort((a, b) => idOrder.get(a.id)! - idOrder.get(b.id)!)

        if (aiMatches.length > 0) {
          const remaining = findSimilarProducts(
            imageSearch.colors,
            result.filter((p) => !idOrder.has(p.id)),
            4
          ).map((s) => s.product)
          result = [...aiMatches, ...remaining]
        } else {
          const similar = findSimilarProducts(imageSearch.colors, result)
          result = similar.map((s) => s.product)
        }
      } else {
        const similar = findSimilarProducts(imageSearch.colors, result)
        result = similar.length > 0 ? similar.map((s) => s.product) : result
      }

      result = [...result].sort(
        (a, b) => (scoresById.get(b.id) ?? 0) - (scoresById.get(a.id) ?? 0)
      )
    }

    if (tagFilter && imageSearch) {
      result = result.filter((p) => productMatchesFilter(p, tagFilter, analysisTags))
    }

    return result
  }, [siteData.products, category, search, imageSearch, tagFilter, scoresById, textHits])

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {t.works.allWorks}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t.works.subtitle}</p>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div className="card p-4">
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
          <div className="lg:col-span-2">
            <ImageSearch
              defaultOpen
              onSearch={(result) => {
                setImageSearch(result)
                setTagFilter(null)
              }}
              onClear={() => {
                setImageSearch(null)
                setTagFilter(null)
              }}
            />
          </div>
        </div>

        {imageSearch?.note && (
          <div
            className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${
              imageSearch.softMatch
                ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
                : 'bg-primary-50 text-primary-800 dark:bg-primary-950 dark:text-primary-200'
            }`}
          >
            <span>{imageSearch.note}</span>
            <span className="font-semibold">
              {filtered.length} {t.works.resultsCount}
            </span>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
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

        {imageSearch && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                tagFilter === null
                  ? 'bg-gray-900 text-white dark:bg-primary-700'
                  : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700'
              }`}
            >
              {t.works.filterAll}
            </button>
            {IMAGE_SEARCH_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTagFilter(f.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-all sm:text-sm ${
                  tagFilter === f.id
                    ? 'bg-gray-900 text-white dark:bg-primary-700'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-700'
                }`}
              >
                {f.label[lang]}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
            {imageSearch && (
              <button
                type="button"
                onClick={() => {
                  setImageSearch(null)
                  setTagFilter(null)
                }}
                className="mt-4 text-sm font-semibold text-primary-600 hover:underline"
              >
                {lang === 'ar' ? 'إلغاء البحث بالصورة' : 'Clear image search'}
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
                  imageSearch
                    ? scoresById.get(product.id)
                    : search.trim()
                      ? textScoresById.get(product.id)
                      : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
