'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import ProductCard from '../components/ProductCard'
import type { WorksImageSearchResult } from '../components/WorksImageSearch'
import { categoryLabels, type Product } from '../data/content'
import { searchProductsByText } from '../utils/productTextSearch'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import OptimizedImage from '../components/OptimizedImage'

const WorksImageSearch = dynamic(() => import('../components/WorksImageSearch'), {
  ssr: false,
})

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
      <Link href={`/works/${product.id}`} className="block">
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
        <Link href={`/works/${product.id}`}>
          <h3 className="font-semibold text-[#e8c547] md:text-gray-900 dark:md:text-gray-100">
            {product.title[lang]}
          </h3>
        </Link>
        <p className="line-clamp-2 text-sm text-white/70 md:text-gray-500 dark:md:text-gray-400">
          {product.description[lang]}
        </p>
        <p className="text-xs font-medium text-white/50 md:text-gray-500">
          {t.works.category}: {categoryLabels[lang][product.category]}
        </p>
        {typeof score === 'number' && (
          <p className="text-xs font-semibold text-[#e8c547] md:text-primary-700 dark:md:text-primary-300">
            {t.works.similarity}: {score}%
          </p>
        )}
        <Link
          href={`/works/${product.id}`}
          className="mt-1 inline-flex rounded-xl bg-[#c9a227] px-3 py-2 text-xs font-bold text-black transition hover:bg-[#d4b03a] md:bg-primary-600 md:text-white md:hover:bg-primary-700"
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
  const [imagePanelOpen, setImagePanelOpen] = useState(false)
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

  const showTextScores = Boolean(search.trim()) && !imageSearch
  const isImageMode = Boolean(imageSearch)

  const clearAll = () => {
    setSearch('')
    setImageSearch(null)
    setImagePanelOpen(false)
  }

  return (
    <div className="bg-black md:bg-transparent">
      <div className="section-padding !pt-6 md:!pt-10">
        <div className="container-main">
          <div className="mb-6 text-center md:mb-10">
            <h1 className="mb-2 text-3xl font-bold text-white md:mb-3 md:text-4xl md:text-gray-800 dark:md:text-gray-100">
              {t.works.featured}
            </h1>
            <p className="mx-auto hidden max-w-2xl text-gray-500 md:block dark:text-gray-400">
              {t.works.subtitle}
            </p>
            <div className="mx-auto mt-3 hidden h-1 w-16 rounded-full bg-primary-500 md:mt-4 md:block" />
          </div>

          {/* Search bar: text + image + clear */}
          <div className="mb-5 md:mb-8">
            <div className="mx-auto max-w-3xl rounded-2xl border border-[#c9a227]/35 bg-[#141414] p-3 md:border-gray-200 md:bg-white md:p-4 md:shadow-sm dark:md:border-gray-700 dark:md:bg-gray-900">
              <label
                className="mb-1.5 block text-xs font-medium text-[#e8c547] md:text-sm md:text-gray-700 dark:md:text-gray-300"
                htmlFor="works-text-search"
              >
                {t.works.search}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                <input
                  id="works-text-search"
                  type="search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    if (e.target.value.trim()) setImageSearch(null)
                  }}
                  placeholder={t.works.searchPlaceholder}
                  className="input-field min-w-0 flex-1 border-white/10 bg-black text-white placeholder:text-white/40 md:border-gray-200 md:bg-white md:text-gray-900 dark:md:border-gray-700 dark:md:bg-gray-950 dark:md:text-gray-100"
                  autoComplete="off"
                  disabled={Boolean(imageSearch)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImagePanelOpen((v) => !v)
                      setSearch('')
                    }}
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition sm:flex-none ${
                      imagePanelOpen || imageSearch
                        ? 'bg-[#c9a227] text-black'
                        : 'border border-[#c9a227]/50 bg-[#c9a227]/15 text-[#e8c547] hover:bg-[#c9a227]/25'
                    }`}
                  >
                    📷 {t.works.searchByImage}
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={!search.trim() && !imageSearch && !imagePanelOpen}
                    className="inline-flex items-center justify-center rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-40 md:border-gray-200 md:text-gray-600 dark:md:border-gray-700 dark:md:text-gray-300"
                  >
                    {t.works.clearResults}
                  </button>
                </div>
              </div>

              <WorksImageSearch
                open={imagePanelOpen}
                onClose={() => setImagePanelOpen(false)}
                onResult={(result) => {
                  setImageSearch(result)
                  setSearch('')
                }}
              />
            </div>
          </div>

          {(search.trim() || imageSearch) && (
            <div
              className={`mb-4 rounded-2xl px-4 py-3 text-sm md:mb-6 ${
                imageSearch?.softMatch
                  ? 'bg-amber-500/15 text-amber-100 md:bg-amber-50 md:text-amber-900 dark:md:bg-amber-950/40 dark:md:text-amber-100'
                  : 'bg-[#c9a227]/15 text-[#e8c547] md:bg-primary-50 md:text-primary-800 dark:md:bg-primary-950 dark:md:text-primary-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {imageSearch
                    ? imageSearch.note ||
                      (lang === 'ar'
                        ? 'نتائج البحث بالصورة — أعمال مشابهة من ضرغام CNC'
                        : 'Image search results — similar Dorgham CNC works')
                    : lang === 'ar'
                      ? `نتائج البحث عن «${search.trim()}»`
                      : `Results for “${search.trim()}”`}
                </span>
                <span className="font-semibold">
                  {filtered.length} {t.works.resultsCount}
                </span>
              </div>
            </div>
          )}

          <div className="mb-4 hidden md:mb-8 md:block">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {search.trim() || imageSearch
                ? lang === 'ar'
                  ? 'نتائج البحث'
                  : 'Search results'
                : t.works.featured}
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg text-white/70 md:text-gray-500 dark:md:text-gray-400">
                {t.works.noResults}
              </p>
              {(search.trim() || imageSearch) && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-4 text-sm font-semibold text-[#e8c547] hover:underline md:text-primary-600"
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
                    showTextScores ? textScoresById.get(product.id) : undefined
                  }
                />
              ))}
            </div>
          )}

          {!isImageMode && (
            <div className="mt-8 text-center md:mt-10">
              <Link
                href="/works/all"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 md:border-primary-200 md:bg-primary-50 md:text-primary-800 md:hover:bg-primary-100 dark:md:border-primary-800 dark:md:bg-primary-950 dark:md:text-primary-200"
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
