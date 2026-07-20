'use client'

import Link from 'next/link'
import type { Product } from '../data/content'
import { useApp } from '../context/AppContext'
import OptimizedImage from './OptimizedImage'

interface WorksSearchResultCardProps {
  product: Product
  score?: number
}

/** Image-search result card shared by featured + all works pages. */
export default function WorksSearchResultCard({ product, score }: WorksSearchResultCardProps) {
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
