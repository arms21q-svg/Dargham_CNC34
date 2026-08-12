'use client'

import Link from 'next/link'
import type { PortfolioCategory } from '../types/siteData'
import { categoryCardImageSrc } from '../utils/categories'
import OptimizedImage from './OptimizedImage'

interface CategoryCardProps {
  category: PortfolioCategory
  lang: 'ar' | 'en'
}

export default function CategoryCard({ category, lang }: CategoryCardProps) {
  const title = category.title[lang] || category.title.ar
  const imageSrc = categoryCardImageSrc(category)

  return (
    <Link
      href={`/categories/${category.slug}`}
      prefetch={false}
      className="group relative block overflow-hidden rounded-2xl bg-[#141414] shadow-md ring-1 ring-white/10 transition-transform duration-200 active:scale-[0.98] md:rounded-xl md:bg-gray-100 md:ring-gray-200/80 md:hover:-translate-y-0.5 md:hover:shadow-lg dark:md:bg-gray-800 dark:md:ring-gray-700"
    >
      <div className="relative aspect-[4/5] overflow-hidden md:aspect-[3/4]">
        {imageSrc ? (
          <OptimizedImage
            src={imageSrc}
            alt={title}
            width={480}
            widths={[240, 320, 480]}
            sizes="(max-width: 768px) 50vw, 25vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-900/40 to-gray-900 text-4xl text-white/30">
            ◆
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
          <h3 className="text-sm font-bold leading-snug text-white md:text-base">{title}</h3>
        </div>
      </div>
    </Link>
  )
}
