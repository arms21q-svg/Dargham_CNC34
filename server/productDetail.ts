import { unstable_cache } from 'next/cache'
import { prisma } from './db'

/** Fields needed to render the product detail page (no vectors / hashes). */
export const PRODUCT_DETAIL_SELECT = {
  id: true,
  titleAr: true,
  titleEn: true,
  descriptionAr: true,
  descriptionEn: true,
  image: true,
  images: true,
  materialsAr: true,
  materialsEn: true,
  dimensionsAr: true,
  dimensionsEn: true,
  category: true,
  featured: true,
  published: true,
  colors: true,
} as const

/** Compact card fields for related / list thumbnails. */
export const PRODUCT_CARD_SELECT = {
  id: true,
  titleAr: true,
  titleEn: true,
  descriptionAr: true,
  descriptionEn: true,
  image: true,
  images: true,
  materialsAr: true,
  materialsEn: true,
  dimensionsAr: true,
  dimensionsEn: true,
  category: true,
  featured: true,
  published: true,
  colors: true,
} as const

export type ProductDetailRow = {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  image: string
  images: string[]
  materialsAr: string
  materialsEn: string
  dimensionsAr: string
  dimensionsEn: string
  category: string
  featured: boolean
  published: boolean
  colors: string[]
}

async function fetchProductById(id: string): Promise<ProductDetailRow | null> {
  const row = await prisma.product.findUnique({
    where: { id },
    select: PRODUCT_DETAIL_SELECT,
  })
  if (!row || row.published === false) return null
  return row
}

/**
 * Single indexed PK lookup + cross-request cache (no AI / no catalog scan).
 */
export async function getProductById(id: string): Promise<ProductDetailRow | null> {
  if (!id || process.env.NEXT_PHASE === 'phase-production-build') return null

  try {
    return await unstable_cache(() => fetchProductById(id), ['product-detail', id], {
      revalidate: 120,
      tags: ['products', `product:${id}`],
    })()
  } catch {
    return null
  }
}

/**
 * Related works — lightweight, indexed by category. Call after detail is painted.
 */
export async function getRelatedProducts(
  id: string,
  category: string,
  limit = 3
): Promise<ProductDetailRow[]> {
  if (!id || !category || process.env.NEXT_PHASE === 'phase-production-build') return []

  try {
    return await unstable_cache(
      async () =>
        prisma.product.findMany({
          where: { category, id: { not: id }, published: true },
          select: PRODUCT_CARD_SELECT,
          orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
          take: limit,
        }),
      ['product-related', id, category, String(limit)],
      { revalidate: 120, tags: ['products', `product:${id}`] }
    )()
  } catch {
    return []
  }
}
