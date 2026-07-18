'use client'

import { memo } from 'react'
import Link from 'next/link'
import type { Product } from '../data/content'
import { useApp } from '../context/AppContext'
import OptimizedImage from './OptimizedImage'

interface ProductCardProps {
  product: Product
  showSave?: boolean
  similarityScore?: number
  /** Mobile 2-col dark catalog look (works pages); desktop keeps the usual card */
  catalogMobile?: boolean
}

function ProductCard({
  product,
  showSave = true,
  similarityScore,
  catalogMobile = false,
}: ProductCardProps) {
  const { lang, t, isSaved, toggleSave } = useApp()
  const saved = isSaved(product.id)

  if (catalogMobile) {
    return (
      <>
        {/* Mobile / phone: 2-col catalog tiles */}
        <Link
          href={`/works/${product.id}`}
          className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#141414] text-center shadow-sm md:hidden"
        >
          <div className="relative aspect-square w-full overflow-hidden bg-black/40">
            <OptimizedImage
              src={product.image}
              alt={product.title[lang]}
              width={480}
              widths={[240, 320, 480]}
              sizes="50vw"
              className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
            />
            {typeof similarityScore === 'number' && (
              <span className="absolute start-2 top-2 z-10 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white">
                {similarityScore}%
              </span>
            )}
          </div>
          <div className="flex min-h-[2.75rem] items-center justify-center px-2.5 py-2.5">
            <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-white sm:text-sm">
              {product.title[lang]}
            </h3>
          </div>
        </Link>

        {/* Tablet / desktop: existing card */}
        <div className="card-hover group hidden overflow-hidden content-visibility-auto md:block">
          <Link href={`/works/${product.id}`} className="block">
            <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
              <OptimizedImage
                src={product.image}
                alt={product.title[lang]}
                width={640}
                widths={[320, 480, 640, 800]}
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {typeof similarityScore === 'number' && (
                <span className="absolute start-3 top-3 z-10 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
                  {similarityScore}%
                </span>
              )}
            </div>
          </Link>

          <div className="p-4">
            <Link href={`/works/${product.id}`}>
              <h3 className="mb-1 font-semibold text-gray-800 transition-colors group-hover:text-primary-600 dark:text-gray-100">
                {product.title[lang]}
              </h3>
            </Link>

            <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
              {product.description[lang]}
            </p>

            <div className="flex items-center justify-end gap-2">
              {showSave && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    toggleSave(product.id)
                  }}
                  className={`rounded-lg p-2 transition-colors ${
                    saved
                      ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                  aria-label={t.works.save}
                >
                  <svg
                    className="h-4 w-4"
                    fill={saved ? 'currentColor' : 'none'}
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
                </button>
              )}
              <Link
                href={`/works/${product.id}`}
                className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
              >
                {t.works.viewDetails}
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="card-hover group overflow-hidden content-visibility-auto">
      <Link href={`/works/${product.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
          <OptimizedImage
            src={product.image}
            alt={product.title[lang]}
            width={640}
            widths={[320, 480, 640, 800]}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {typeof similarityScore === 'number' && (
            <span className="absolute start-3 top-3 z-10 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white shadow-lg backdrop-blur-sm">
              {similarityScore}%
            </span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/works/${product.id}`}>
          <h3 className="mb-1 font-semibold text-gray-800 transition-colors group-hover:text-primary-600 dark:text-gray-100">
            {product.title[lang]}
          </h3>
        </Link>

        <p className="mb-3 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">
          {product.description[lang]}
        </p>

        <div className="flex items-center justify-end gap-2">
          {showSave && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                toggleSave(product.id)
              }}
              className={`rounded-lg p-2 transition-colors ${
                saved
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                  : 'bg-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
              aria-label={t.works.save}
            >
              <svg
                className="h-4 w-4"
                fill={saved ? 'currentColor' : 'none'}
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
            </button>
          )}
          <Link
            href={`/works/${product.id}`}
            className="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-primary-700"
          >
            {t.works.viewDetails}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default memo(ProductCard)
