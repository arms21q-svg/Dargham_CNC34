'use client'

import type { PortfolioCategory } from '../types/siteData'
import CategoryCard from './CategoryCard'

interface CategoryGridProps {
  categories: PortfolioCategory[]
  lang: 'ar' | 'en'
}

export default function CategoryGrid({ categories, lang }: CategoryGridProps) {
  if (categories.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
      {categories.map((category) => (
        <CategoryCard key={category.id} category={category} lang={lang} />
      ))}
    </div>
  )
}

export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl md:rounded-xl">
          <div className="aspect-[4/5] animate-pulse bg-gray-200 dark:bg-gray-800 md:aspect-[3/4]" />
        </div>
      ))}
    </div>
  )
}
