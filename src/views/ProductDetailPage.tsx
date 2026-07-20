'use client'

import { useEffect, useMemo, useState, startTransition } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import DirectionalArrow from '../components/DirectionalArrow'
import ProductCard from '../components/ProductCard'
import OptimizedImage from '../components/OptimizedImage'
import { categoryLabels, type Product } from '../data/content'
import { downloadImage } from '../utils/imageSearch'
import { apiUrl } from '../utils/apiBase'
import { useApp } from '../context/AppContext'

type InitialProduct = {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  image: string
  materialsAr: string
  materialsEn: string
  dimensionsAr: string
  dimensionsEn: string
  category: string
  featured: boolean
  colors: string[]
}

function toProduct(p: InitialProduct): Product {
  return {
    id: p.id,
    title: { ar: p.titleAr, en: p.titleEn || p.titleAr },
    description: { ar: p.descriptionAr, en: p.descriptionEn || p.descriptionAr },
    category: p.category as Product['category'],
    image: p.image,
    materials: { ar: p.materialsAr, en: p.materialsEn || p.materialsAr },
    dimensions: { ar: p.dimensionsAr, en: p.dimensionsEn || p.dimensionsAr },
    featured: p.featured,
    colors: p.colors?.length ? p.colors : ['#8B7355'],
  }
}

function DetailSkeleton() {
  return (
    <div className="section-padding animate-pulse">
      <div className="container-main">
        <div className="mb-6 h-10 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[4/3] rounded-2xl bg-gray-200 dark:bg-gray-800" />
          <div className="space-y-4">
            <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-4/5 max-w-md rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductDetailPage({
  initialProduct = null,
}: {
  initialProduct?: InitialProduct | null
}) {
  const params = useParams()
  const id =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : initialProduct?.id

  const { lang, t, isSaved, toggleSave } = useApp()
  const [related, setRelated] = useState<Product[]>([])

  // Critical path: server product only — never wait on full site catalog / AI
  const product = useMemo(() => {
    if (initialProduct && (!id || initialProduct.id === id)) {
      return toProduct(initialProduct)
    }
    return undefined
  }, [id, initialProduct])

  useEffect(() => {
    if (!product?.id) return
    let cancelled = false

    const loadRelated = () => {
      void fetch(apiUrl(`/api/products/${encodeURIComponent(product.id)}/related`), {
        cache: 'force-cache',
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((json: { products?: InitialProduct[] } | null) => {
          if (cancelled || !json?.products?.length) return
          startTransition(() => {
            setRelated(json.products!.map(toProduct))
          })
        })
        .catch(() => {
          /* non-critical */
        })
    }

    const idle =
      typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(loadRelated, { timeout: 1200 })
        : null
    const timer = window.setTimeout(loadRelated, idle == null ? 200 : 900)

    return () => {
      cancelled = true
      if (idle != null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idle)
      }
      window.clearTimeout(timer)
    }
  }, [product?.id])

  if (!product) {
    if (!initialProduct && id) return <DetailSkeleton />
    return (
      <div className="section-padding text-center">
        <p className="text-lg text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
        <Link href="/works" className="btn-primary mt-4" prefetch>
          {t.common.back}
        </Link>
      </div>
    )
  }

  return (
    <div className="section-padding">
      <div className="container-main">
        <Link href="/works" className="btn-ghost group mb-6 inline-flex items-center gap-1.5" prefetch>
          <DirectionalArrow direction="back" />
          {t.common.back}
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
            <OptimizedImage
              src={product.image}
              alt={product.title[lang]}
              width={960}
              widths={[480, 720, 960]}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className="h-full w-full object-cover"
            />
          </div>

          <div>
            <span className="mb-2 inline-block rounded-lg bg-primary-100 px-3 py-1 text-sm font-medium text-primary-700 dark:bg-primary-900 dark:text-primary-300">
              {categoryLabels[lang][product.category] ?? product.category}
            </span>

            <h1 className="mb-4 text-3xl font-bold text-gray-800 dark:text-gray-100 lg:text-4xl">
              {product.title[lang]}
            </h1>

            <p className="mb-6 leading-relaxed text-gray-600 dark:text-gray-400">
              {product.description[lang]}
            </p>

            <div className="mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t.works.materials}:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {product.materials[lang]}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t.works.dimensions}:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {product.dimensions[lang]}
                </span>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">{t.works.category}:</span>
              <div className="flex gap-1">
                {product.colors.map((color, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-gray-800"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => toggleSave(product.id)}
                className={`btn-secondary ${isSaved(product.id) ? '!bg-primary-50 !text-primary-700' : ''}`}
              >
                <svg
                  className="h-5 w-5"
                  fill={isSaved(product.id) ? 'currentColor' : 'none'}
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {isSaved(product.id) ? t.works.saved : t.works.save}
              </button>

              <button
                type="button"
                onClick={() => downloadImage(product.image, `${product.title.en || product.id}.jpg`)}
                className="btn-secondary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {t.works.download}
              </button>

              <Link href="/contact" className="btn-primary" prefetch>
                {t.home.contactUs}
              </Link>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-8 text-2xl font-bold text-gray-800 dark:text-gray-100">
              {t.works.related}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
