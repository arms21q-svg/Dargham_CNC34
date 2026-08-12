import { Prisma } from '@prisma/client'
import { cache } from 'react'
import type { Prisma as PrismaTypes } from '@prisma/client'
import { prisma } from './db'
import type { SiteData } from '@/types/siteData'
import { createDefaultCategories, LEGACY_CATEGORY_SLUG } from '@/data/defaultCategories'
import type { ProductMapperInput } from './mappers'

/** Full public catalog — used by /api/site-data for visitors. */
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  titleAr: true,
  titleEn: true,
  descriptionAr: true,
  descriptionEn: true,
  category: true,
  categoryId: true,
  displayNumber: true,
  image: true,
  images: true,
  materialsAr: true,
  materialsEn: true,
  dimensionsAr: true,
  dimensionsEn: true,
  featured: true,
  published: true,
  colors: true,
  sortOrder: true,
} satisfies PrismaTypes.ProductSelect

/** Minimal SSR bootstrap — cover image only, no gallery / materials / dimensions. */
const BOOTSTRAP_PRODUCT_SELECT = {
  id: true,
  titleAr: true,
  titleEn: true,
  descriptionAr: true,
  descriptionEn: true,
  category: true,
  categoryId: true,
  displayNumber: true,
  image: true,
  featured: true,
  published: true,
  sortOrder: true,
} satisfies PrismaTypes.ProductSelect

type FetchOptions = {
  /** Published products only */
  publicCatalog?: boolean
  /** Layout bootstrap — smallest payload (under Next.js 2MB data cache limit) */
  bootstrap?: boolean
}

type LegacyProductRow = {
  id: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  category: string
  image: string
  images: string[]
  materialsAr: string
  materialsEn: string
  dimensionsAr: string
  dimensionsEn: string
  featured: boolean
  published: boolean
  colors: string[]
  sortOrder: number
}

function isMissingCategoriesSchema(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code === 'P2021') {
    const table = String(error.meta?.table ?? '')
    return table.includes('PortfolioCategory')
  }
  if (error.code !== 'P2022') return false
  const column = String(error.meta?.column ?? '')
  return column.includes('categoryId') || column.includes('displayNumber')
}

function mapLegacyProducts(rows: LegacyProductRow[], bootstrap: boolean): ProductMapperInput[] {
  const categories = createDefaultCategories()
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))
  const defaultCategoryId = categories[0]?.id ?? null
  const counters = new Map<string, number>()

  return rows.map((row) => {
    const slug = LEGACY_CATEGORY_SLUG[row.category] ?? categories[0]?.slug ?? 'decor'
    const categoryId = slugToId.get(slug) ?? defaultCategoryId
    const next = categoryId ? (counters.get(categoryId) ?? 0) + 1 : 0
    if (categoryId) counters.set(categoryId, next)

    const base: ProductMapperInput = {
      id: row.id,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      category: row.category,
      categoryId,
      displayNumber: next,
      image: row.image,
      featured: row.featured,
      published: row.published,
      sortOrder: row.sortOrder,
    }

    if (bootstrap) {
      return {
        ...base,
        descriptionAr: row.descriptionAr,
        descriptionEn: row.descriptionEn,
      }
    }

    return {
      ...base,
      descriptionAr: row.descriptionAr,
      descriptionEn: row.descriptionEn,
      images: row.images,
      materialsAr: row.materialsAr,
      materialsEn: row.materialsEn,
      dimensionsAr: row.dimensionsAr,
      dimensionsEn: row.dimensionsEn,
      colors: row.colors,
    }
  })
}

async function fetchLegacyProducts(publicCatalog: boolean, bootstrap: boolean): Promise<LegacyProductRow[]> {
  const publishedFilter = publicCatalog ? Prisma.sql`WHERE published = true` : Prisma.empty

  if (bootstrap) {
    return prisma.$queryRaw<LegacyProductRow[]>`
      SELECT
        id, "titleAr", "titleEn", "descriptionAr", "descriptionEn", category, image,
        ARRAY[]::text[] as images,
        '' as "materialsAr", '' as "materialsEn", '' as "dimensionsAr", '' as "dimensionsEn",
        featured, published, ARRAY[]::text[] as colors, "sortOrder"
      FROM "Product"
      ${publishedFilter}
      ORDER BY "sortOrder" ASC
    `
  }

  return prisma.$queryRaw<LegacyProductRow[]>`
    SELECT
      id, "titleAr", "titleEn", "descriptionAr", "descriptionEn", category, image, images,
      "materialsAr", "materialsEn", "dimensionsAr", "dimensionsEn",
      featured, published, colors, "sortOrder"
    FROM "Product"
    ${publishedFilter}
    ORDER BY "sortOrder" ASC
  `
}

async function fetchSiteDataLegacy(options?: FetchOptions): Promise<SiteData | null> {
  const publicCatalog = options?.publicCatalog ?? false
  const bootstrap = options?.bootstrap ?? false

  const [config, products, managers] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    fetchLegacyProducts(publicCatalog, bootstrap),
    bootstrap ? Promise.resolve([]) : prisma.manager.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  if (!config) return null

  console.warn(
    '[site-data] categories schema missing in DB — legacy fallback active. Run: npm run db:migrate-categories'
  )

  const { toSiteData } = await import('./mappers')
  return toSiteData(config, mapLegacyProducts(products, bootstrap), managers, [])
}

async function fetchSiteDataRaw(options?: FetchOptions): Promise<SiteData | null> {
  const publicCatalog = options?.publicCatalog ?? false
  const bootstrap = options?.bootstrap ?? false

  try {
    const [config, managers, categories] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      bootstrap ? Promise.resolve([]) : prisma.manager.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.portfolioCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])

    if (!config) return null

    const products = bootstrap
      ? await prisma.product.findMany({
          where: { published: true },
          orderBy: { sortOrder: 'asc' },
          select: BOOTSTRAP_PRODUCT_SELECT,
        })
      : publicCatalog
        ? await prisma.product.findMany({
            where: { published: true },
            orderBy: { sortOrder: 'asc' },
            select: PUBLIC_PRODUCT_SELECT,
          })
        : await prisma.product.findMany({ orderBy: { sortOrder: 'asc' } })

    const { toSiteData } = await import('./mappers')
    return toSiteData(config, products, managers, categories)
  } catch (error) {
    if (isMissingCategoriesSchema(error)) {
      return fetchSiteDataLegacy(options)
    }
    throw error
  }
}

/** Bypass any cache — read directly from DB (e.g. right after publish). */
export async function fetchSiteDataFresh(): Promise<SiteData | null> {
  return fetchSiteDataRaw()
}

/** Full site payload for admin API — per-request dedupe only (payload may exceed 2MB data cache). */
export const getCachedSiteData = cache(async (): Promise<SiteData | null> => {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null
  return fetchSiteDataRaw()
})

/** Minimal SSR bootstrap — per-request dedupe; avoids unstable_cache 2MB limit. */
export const getCachedPublicSiteData = cache(async (): Promise<SiteData | null> => {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null
  return fetchSiteDataRaw({ publicCatalog: true, bootstrap: true })
})

/** Full public catalog for /api/site-data GET (non-admin). */
export const getCachedPublicCatalogData = cache(async (): Promise<SiteData | null> => {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null
  return fetchSiteDataRaw({ publicCatalog: true })
})
