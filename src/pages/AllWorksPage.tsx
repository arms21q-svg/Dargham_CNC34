import { useMemo, useState } from 'react'
import ProductCard from '../components/ProductCard'
import ImageSearch, { type ImageSearchResult } from '../components/ImageSearch'
import { categoryLabels, type Category } from '../data/content'
import { findSimilarProducts } from '../utils/imageSearch'
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
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [imageSearch, setImageSearch] = useState<ImageSearchResult | null>(null)

  const filtered = useMemo(() => {
    let result = siteData.products

    if (category !== 'all') {
      result = result.filter((p) => p.category === category)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.ar.includes(q) ||
          p.title.en.toLowerCase().includes(q) ||
          p.description.ar.includes(q) ||
          p.description.en.toLowerCase().includes(q) ||
          p.materials.ar.includes(q) ||
          p.materials.en.toLowerCase().includes(q)
      )
    }

    if (imageSearch) {
      if (imageSearch.productIds.length > 0) {
        const idOrder = new Map(imageSearch.productIds.map((id, i) => [id, i]))
        const aiMatches = result
          .filter((p) => idOrder.has(p.id))
          .sort((a, b) => (idOrder.get(a.id)! - idOrder.get(b.id)!))

        if (aiMatches.length > 0) {
          // merge leftover color matches for more coverage
          const remaining = findSimilarProducts(
            imageSearch.colors,
            result.filter((p) => !idOrder.has(p.id)),
            4
          ).map((s) => s.product)

          return [...aiMatches, ...remaining]
        }
      }

      const similar = findSimilarProducts(imageSearch.colors, result)
      if (similar.length > 0) return similar.map((s) => s.product)
    }

    return result
  }, [siteData.products, category, search, imageSearch])

  const scoresById = useMemo(() => {
    if (!imageSearch?.colors.length) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const item of findSimilarProducts(imageSearch.colors, siteData.products, 50)) {
      map.set(item.product.id, item.score)
    }
    return map
  }, [imageSearch, siteData.products])

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
              onSearch={(result) => setImageSearch(result)}
              onClear={() => setImageSearch(null)}
            />
          </div>
        </div>

        {imageSearch?.note && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-primary-50 px-4 py-3 text-sm text-primary-800 dark:bg-primary-950 dark:text-primary-200">
            <span>{imageSearch.note}</span>
            <span className="font-semibold">
              {filtered.length} {lang === 'ar' ? 'نتيجة' : 'results'}
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
            {imageSearch && (
              <button
                type="button"
                onClick={() => setImageSearch(null)}
                className="mt-4 text-sm font-semibold text-primary-600 hover:underline"
              >
                {lang === 'ar' ? 'إلغاء البحث بالصورة' : 'Clear image search'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <div key={product.id} className="relative">
                {imageSearch && scoresById.has(product.id) && (
                  <span className="absolute start-3 top-3 z-10 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">
                    {scoresById.get(product.id)}%
                  </span>
                )}
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
