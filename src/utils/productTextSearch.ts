import type { Product } from '../data/content'
import { categoryLabels, type Category, type Lang } from '../data/content'

/** Normalize Arabic/English for more reliable matching */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '') // Arabic diacritics
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(q: string): string[] {
  return normalizeSearchText(q)
    .split(' ')
    .filter((t) => t.length >= 1)
}

export type TextSearchHit = {
  product: Product
  score: number
}

/**
 * Rank products by text relevance across title, materials, description, category.
 * Exact / prefix title matches always float to the top.
 */
export function searchProductsByText(
  products: Product[],
  query: string,
  lang: Lang
): TextSearchHit[] {
  const q = normalizeSearchText(query)
  if (!q) {
    return products.map((product) => ({ product, score: 0 }))
  }

  const tokens = tokenize(query)
  const hits: TextSearchHit[] = []

  for (const product of products) {
    const title = normalizeSearchText(product.title[lang])
    const titleAlt = normalizeSearchText(product.title[lang === 'ar' ? 'en' : 'ar'])
    const materials = normalizeSearchText(
      `${product.materials.ar} ${product.materials.en}`
    )
    const description = normalizeSearchText(
      `${product.description.ar} ${product.description.en}`
    )
    const dimensions = normalizeSearchText(
      `${product.dimensions.ar} ${product.dimensions.en}`
    )
    const categoryAr = normalizeSearchText(categoryLabels.ar[product.category as Category] ?? '')
    const categoryEn = normalizeSearchText(categoryLabels.en[product.category as Category] ?? '')
    const categoryRaw = normalizeSearchText(product.category)
    const hayAll = [title, titleAlt, materials, description, dimensions, categoryAr, categoryEn, categoryRaw].join(' ')

    // Every token must appear somewhere
    if (!tokens.every((t) => hayAll.includes(t))) continue

    let score = 0

    // Exact title
    if (title === q || titleAlt === q) score = Math.max(score, 100)
    // Title starts with query
    else if (title.startsWith(q) || titleAlt.startsWith(q)) score = Math.max(score, 96)
    // Full query inside title
    else if (title.includes(q) || titleAlt.includes(q)) score = Math.max(score, 90)

    // Token hits in title
    const titleTokenHits = tokens.filter((t) => title.includes(t) || titleAlt.includes(t)).length
    if (titleTokenHits) {
      score = Math.max(score, 70 + Math.round((titleTokenHits / tokens.length) * 22))
    }

    if (materials.includes(q) || tokens.every((t) => materials.includes(t))) {
      score = Math.max(score, 78)
    } else {
      const matHits = tokens.filter((t) => materials.includes(t)).length
      if (matHits) score = Math.max(score, 58 + Math.round((matHits / tokens.length) * 16))
    }

    if (categoryAr.includes(q) || categoryEn.includes(q) || categoryRaw.includes(q)) {
      score = Math.max(score, 74)
    }

    if (description.includes(q)) {
      score = Math.max(score, 66)
    } else {
      const descHits = tokens.filter((t) => description.includes(t)).length
      if (descHits) score = Math.max(score, 48 + Math.round((descHits / tokens.length) * 14))
    }

    if (dimensions.includes(q) || tokens.some((t) => dimensions.includes(t))) {
      score = Math.max(score, 55)
    }

    // Featured boost (tiny)
    if (product.featured && score >= 48) score = Math.min(100, score + 2)

    if (score > 0) hits.push({ product, score })
  }

  hits.sort((a, b) => b.score - a.score || a.product.title[lang].localeCompare(b.product.title[lang], lang))
  return hits
}
