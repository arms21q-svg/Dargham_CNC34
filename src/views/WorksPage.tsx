'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard'
import type { ImageSearchResult } from '../components/ImageSearch'
import { IMAGE_SEARCH_FILTERS, productMatchesFilter } from '../data/imageSearchFilters'
import { findSimilarProducts } from '../utils/imageSearch'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

const ImageSearch = dynamic(() => import('../components/ImageSearch'), {
  ssr: false,
  loading: () => (
    <div className="mx-auto h-12 w-56 animate-pulse rounded-2xl bg-primary-100 dark:bg-primary-900/40" />
  ),
})

export default function WorksPage() {
  const { lang, t } = useApp()
  const { siteData } = useSiteData()
  const [imageSearch, setImageSearch] = useState<ImageSearchResult | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const scoresById = useMemo(() => {
    const map = new Map<string, number>()
    if (!imageSearch) return map

    for (const m of imageSearch.matches ?? []) {
      map.set(m.id, m.score)
    }

    if (imageSearch.colors.length) {
      for (const item of findSimilarProducts(imageSearch.colors, siteData.products, 50)) {
        if (!map.has(item.product.id)) map.set(item.product.id, item.score)
      }
    }

    return map
  }, [imageSearch, siteData.products])

  const filtered = useMemo(() => {
    let result = siteData.products
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
          result = findSimilarProducts(imageSearch.colors, result).map((s) => s.product)
        }
      } else {
        result = findSimilarProducts(imageSearch.colors, result).map((s) => s.product)
      }
    }

    if (tagFilter) {
      result = result.filter((p) => productMatchesFilter(p, tagFilter, analysisTags))
    }

    if (imageSearch) {
      result = [...result].sort(
        (a, b) => (scoresById.get(b.id) ?? 0) - (scoresById.get(a.id) ?? 0)
      )
    }

    return result
  }, [siteData.products, imageSearch, tagFilter, scoresById])

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">{t.works.title}</h1>
          <p className="mx-auto max-w-2xl text-gray-500 dark:text-gray-400">{t.works.subtitle}</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <div className="mb-8 mx-auto max-w-2xl">
          <ImageSearch
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

        {imageSearch?.note && (
          <div
            className={`mb-6 rounded-2xl px-4 py-3 text-sm ${
              imageSearch.softMatch
                ? 'bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
                : 'bg-primary-50 text-primary-800 dark:bg-primary-950 dark:text-primary-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{imageSearch.note}</span>
              <span className="font-semibold">
                {filtered.length} {t.works.resultsCount}
              </span>
            </div>
          </div>
        )}

        {imageSearch && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tagFilter === null
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {t.works.filterAll}
            </button>
            {IMAGE_SEARCH_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTagFilter(f.id)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  tagFilter === f.id
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {f.label[lang]}
              </button>
            ))}
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {imageSearch ? (lang === 'ar' ? 'نتائج البحث' : 'Search results') : t.works.allWorks}
          </h2>
        </div>

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
                similarityScore={imageSearch ? scoresById.get(product.id) : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
