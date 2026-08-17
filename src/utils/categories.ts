import type { PortfolioCategory, Product } from '../types/siteData'

export function publicCategories(categories: PortfolioCategory[]): PortfolioCategory[] {
  return [...categories]
    .filter((c) => c.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function getCategoryBySlug(
  categories: PortfolioCategory[],
  slug: string
): PortfolioCategory | undefined {
  return categories.find((c) => c.slug === slug)
}

export function getCategoryById(
  categories: PortfolioCategory[],
  id: string
): PortfolioCategory | undefined {
  return categories.find((c) => c.id === id)
}

export function categoryTitle(
  category: PortfolioCategory | undefined,
  lang: 'ar' | 'en'
): string {
  if (!category) return ''
  return category.title[lang] || category.title.ar || category.title.en
}

export function productsInCategory(
  products: Product[],
  categoryId: string,
  publishedOnly = true
): Product[] {
  return products
    .filter((p) => p.categoryId === categoryId && (!publishedOnly || p.published !== false))
    .sort((a, b) => (a.displayNumber ?? 0) - (b.displayNumber ?? 0))
}

export function nextDisplayNumber(products: Product[], categoryId: string): number {
  const max = products
    .filter((p) => p.categoryId === categoryId)
    .reduce((acc, p) => Math.max(acc, p.displayNumber ?? 0), 0)
  return Math.max(1, max + 1)
}

/** Next N sequential display numbers for bulk import (e.g. 4,5,6). */
export function allocateDisplayNumbers(
  products: Product[],
  categoryId: string,
  count: number
): number[] {
  const next = nextDisplayNumber(products, categoryId)
  return Array.from({ length: count }, (_, i) => next + i)
}

export function isDisplayNumberTaken(
  products: Product[],
  categoryId: string,
  displayNumber: number,
  excludeProductId?: string
): boolean {
  if (displayNumber < 1) return true
  return products.some(
    (p) =>
      p.categoryId === categoryId &&
      p.id !== excludeProductId &&
      (p.displayNumber ?? 0) === displayNumber
  )
}

/** Validate display number before save — returns Arabic error or null if ok. */
export function validateProductDisplayNumber(
  products: Product[],
  categoryId: string,
  displayNumber: number,
  productId: string,
  batchNumbers: number[] = []
): string | null {
  if (!Number.isFinite(displayNumber) || displayNumber < 1) {
    return 'رقم العمل يجب أن يكون 1 أو أكبر'
  }
  if (isDisplayNumberTaken(products, categoryId, displayNumber, productId)) {
    return `الرقم ${displayNumber} مستخدم مسبقاً في هذا التصنيف`
  }
  if (batchNumbers.filter((n) => n === displayNumber).length > 1) {
    return `الرقم ${displayNumber} مكرر بين الأعمال الجديدة`
  }
  return null
}

export function categoryImageProxyPath(categoryId: string): string {
  return `/api/categories/${encodeURIComponent(categoryId)}/image`
}

export function categoryCardImageSrc(category: PortfolioCategory): string {
  const url = category.image?.trim()
  if (!url) return ''
  if (url.startsWith('/api/categories/')) return url
  return url
}
