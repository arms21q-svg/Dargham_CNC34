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
  return max + 1
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
