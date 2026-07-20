'use client'

import type { Product } from '../data/content'
import ProductCard from './ProductCard'

interface WorksCatalogGridProps {
  products: Product[]
  /** When set with searchActive, shows % on matching cards */
  similarityScores?: Map<string, number>
  searchActive?: boolean
  /** Desktop column count; mobile is always 2 columns like /works */
  desktopCols?: 3 | 4
}

const desktopColClass = {
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
} as const

/** Same product grid as All Works (mobile 2-col catalog tiles + desktop cards). */
export default function WorksCatalogGrid({
  products,
  similarityScores,
  searchActive = false,
  desktopCols = 3,
}: WorksCatalogGridProps) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:gap-6 ${desktopColClass[desktopCols]}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          catalogMobile
          similarityScore={
            searchActive ? similarityScores?.get(product.id) : undefined
          }
        />
      ))}
    </div>
  )
}

/** Skeleton matching catalogMobile tiles (phone) and desktop cards. */
export function WorksCatalogSkeleton({
  count = 4,
  desktopCols = 3,
}: {
  count?: number
  desktopCols?: 3 | 4
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 md:gap-6 ${desktopColClass[desktopCols]}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>
          {/* Mobile tile */}
          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141414] md:hidden">
            <div className="aspect-square animate-pulse bg-white/10" />
            <div className="flex min-h-[2.75rem] items-center justify-center px-2.5 py-2.5">
              <div className="h-3 w-2/3 animate-pulse rounded bg-white/15" />
            </div>
          </div>
          {/* Desktop card */}
          <div className="card-hover hidden overflow-hidden md:block">
            <div className="aspect-[4/3] animate-pulse bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
