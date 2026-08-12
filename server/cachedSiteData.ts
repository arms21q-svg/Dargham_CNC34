import { Prisma } from '@prisma/client'
import { unstable_cache } from 'next/cache'
import type { Prisma as PrismaTypes } from '@prisma/client'
import { prisma } from './db'
import type { SiteData } from '@/types/siteData'
import { createDefaultCategories, LEGACY_CATEGORY_SLUG } from '@/data/defaultCategories'
import type { ProductMapperInput } from './mappers'

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

function mapLegacyProducts(rows: LegacyProductRow[]): ProductMapperInput[] {
  const categories = createDefaultCategories()
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))
  const defaultCategoryId = categories[0]?.id ?? null
  const counters = new Map<string, number>()

  return rows.map((row) => {
    const slug = LEGACY_CATEGORY_SLUG[row.category] ?? categories[0]?.slug ?? 'decor'
    const categoryId = slugToId.get(slug) ?? defaultCategoryId
    const next = categoryId ? (counters.get(categoryId) ?? 0) + 1 : 0
    if (categoryId) counters.set(categoryId, next)

    return {
      ...row,
      categoryId,
      displayNumber: next,
    }
  })
}

async function fetchLegacyProducts(publicCatalog: boolean): Promise<LegacyProductRow[]> {
  if (publicCatalog) {
    return prisma.$queryRaw<LegacyProductRow[]>`
      SELECT
        id, "titleAr", "titleEn", "descriptionAr", "descriptionEn", category, image, images,
        "materialsAr", "materialsEn", "dimensionsAr", "dimensionsEn",
        featured, published, colors, "sortOrder"
      FROM "Product"
      WHERE published = true
      ORDER BY "sortOrder" ASC
    `
  }

  return prisma.$queryRaw<LegacyProductRow[]>`
    SELECT
      id, "titleAr", "titleEn", "descriptionAr", "descriptionEn", category, image, images,
      "materialsAr", "materialsEn", "dimensionsAr", "dimensionsEn",
      featured, published, colors, "sortOrder"
    FROM "Product"
    ORDER BY "sortOrder" ASC
  `
}

async function fetchSiteDataLegacy(options?: { publicCatalog?: boolean }): Promise<SiteData | null> {
  const publicCatalog = options?.publicCatalog ?? false

  const [config, products, managers] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    fetchLegacyProducts(publicCatalog),
    prisma.manager.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])

  if (!config) return null

  console.warn(
    '[site-data] categories schema missing in DB — legacy fallback active. Run: npm run db:migrate-categories'
  )

  const { toSiteData } = await import('./mappers')
  return toSiteData(config, mapLegacyProducts(products), managers, [])
}

async function fetchSiteDataRaw(options?: { publicCatalog?: boolean }): Promise<SiteData | null> {
  const publicCatalog = options?.publicCatalog ?? false

  try {
    const [config, products, managers, categories] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      publicCatalog
        ? prisma.product.findMany({
            where: { published: true },
            orderBy: { sortOrder: 'asc' },
            select: PUBLIC_PRODUCT_SELECT,
          })
        : prisma.product.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.manager.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.portfolioCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
    ])

    if (!config) return null
    const { toSiteData } = await import('./mappers')
    return toSiteData(config, products, managers, categories)
  } catch (error) {
    if (isMissingCategoriesSchema(error)) {
      return fetchSiteDataLegacy(options)
    }
    throw error
  }
}

/** Bypass unstable_cache — read directly from DB (e.g. right after publish). */
export async function fetchSiteDataFresh(): Promise<SiteData | null> {
  return fetchSiteDataRaw()
}

/** Full site payload for admin API — invalidated via revalidateTag('site-data') on publish. */
export async function getCachedSiteData(): Promise<SiteData | null> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null

  try {
    return await unstable_cache(() => fetchSiteDataRaw(), ['site-data-full-v1'], {
      revalidate: false,
      tags: ['site-data'],
    })()
  } catch {
    return fetchSiteDataRaw()
  }
}

/** Lightweight public catalog — no image vectors/hashes, published products only. */
export async function getCachedPublicSiteData(): Promise<SiteData | null> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null

  try {
    return await unstable_cache(() => fetchSiteDataRaw({ publicCatalog: true }), ['site-data-public-v1'], {
      revalidate: false,
      tags: ['site-data'],
    })()
  } catch {
    return fetchSiteDataRaw({ publicCatalog: true })
  }
}
