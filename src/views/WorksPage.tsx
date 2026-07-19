'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ProductCard from '../components/ProductCard'
import WorksSearchBar, { type WorksImageSearchResult } from '../components/WorksSearchBar'
import OptimizedImage from '../components/OptimizedImage'
import type { Product } from '../data/content'
import { searchProductsByText } from '../utils/productTextSearch'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

function SearchResultCard({
  product,
  score,
}: {
  product: Product
  score?: number
}) {
  const { lang, t } = useApp()

  return (
    <article className="overflow-hidden rounded-2xl border border-[#c9a227]/25 bg-[#141414] text-white shadow-sm md:border-gray-200 md:bg-white md:text-gray-900 dark:md:border-gray-800 dark:md:bg-gray-900 dark:md:text-gray-100">
      <Link href={`/works/${product.id}`} prefetch className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
          <OptimizedImage
            src={product.image}
            alt={product.title[lang]}
            width={640}
            widths={[320, 480, 640]}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="h-full w-full object-cover"
          />
          {typeof score === 'number' && (
            <span className="absolute start-3 top-3 rounded-full bg-[#c9a227] px-2.5 py-1 text-xs font-bold text-black shadow">
              {score}%
            </span>
          )}
        </div>
      </Link>
      <div className="space-y-2 p-4">
        <h3 className="font-semibold text-[#e8c547] md:text-gray-900 dark:md:text-gray-100">
          {product.title[lang]}
        </h3>
        {typeof score === 'number' && (
          <p className="text-xs font-semibold text-[#e8c547]">
            {t.works.similarity}: {score}%
          </p>
        )}
        <Link
          href={`/works/${product.id}`}
          prefetch
          className="mt-1 inline-flex rounded-xl bg-[#c9a227] px-3 py-2 text-xs font-bold text-black"
        >
          {t.works.viewDetails}
        </Link>
      </div>
    </article>
  )
}

export default function WorksPage() {
  const { lang, t } = useApp()
  const { siteData } = useSiteData()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '')
  const [imageSearch, setImageSearch] = useState<WorksImageSearchResult | null>(null)

  const featuredProducts = useMemo(
    () => siteData.products.filter((p) => p.featured),
    [siteData.products]
  )

  const textHits = useMemo(
    () => searchProductsByText(featuredProducts, search, lang),
    [featuredProducts, search, lang]
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
    const byId = new Map(siteData.products.map((p) => [p.id, p]))
    return imageSearch.productIds
      .map((id) => byId.get(id))
      .filter((p): p is Product => Boolean(p))
  }, [imageSearch, siteData.products])

  const filtered = useMemo(() => {
    if (imageSearch) return imageResults
    if (search.trim()) return textHits.map((h) => h.product)
    return featuredProducts
  }, [imageSearch, imageResults, search, textHits, featuredProducts])

  const isImageMode = Boolean(imageSearch)

  return (
    <div className="bg-black md:bg-transparent">
      <div className="section-padding !pt-6 md:!pt-10">
        <div className="container-main">
          <div className="mb-6 text-center md:mb-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:mb-3 md:text-4xl md:text-gray-800 dark:md:text-gray-100">
              {t.works.featured}
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
                <SearchResultCard
                  key={product.id}
                  product={product}
                  score={imageScoresById.get(product.id)}
                />
              ))}
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

          {!isImageMode && (
            <div className="mt-8 text-center md:mt-10">
              <Link
                href="/works/all"
                prefetch
                className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-700"
              >
                {t.works.allWorks} →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
