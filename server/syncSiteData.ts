import { Prisma } from '@prisma/client'
import { prisma } from './db'
import {
  configFromSiteData,
  categoryFromSiteData,
  managerFromSiteData,
  productFromSiteData,
} from './mappers'
import { isProxyMediaUrl } from './mediaUrls'
import type { SiteData } from '../src/types/siteData'

type ProductRow = ReturnType<typeof productFromSiteData>
type ManagerRow = ReturnType<typeof managerFromSiteData>
type CategoryRow = ReturnType<typeof categoryFromSiteData>

/** Last occurrence wins — prevents createMany unique(id) failures. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return [...map.values()]
}

/** Never overwrite stored base64/URL with public proxy paths from a stripped client payload. */
function preserveStoredMedia(incoming: string, stored: string): string {
  if (incoming && !isProxyMediaUrl(incoming)) return incoming
  if (stored && !isProxyMediaUrl(stored)) return stored
  return incoming || stored
}

function preserveStoredGallery(incoming: string[], stored: string[]): string[] {
  if (incoming.length === 0) return stored
  const merged = incoming.map((url, i) => preserveStoredMedia(url, stored[i] ?? ''))
  const hasRealIncoming = merged.some((u) => u && !isProxyMediaUrl(u))
  if (!hasRealIncoming && stored.some((u) => u && !isProxyMediaUrl(u))) {
    return stored
  }
  return merged.filter(Boolean)
}

function applyStoredProductMedia(
  row: ProductRow,
  prev: { image: string; images: string[] }
): ProductRow {
  return {
    ...row,
    image: preserveStoredMedia(row.image, prev.image),
    images: preserveStoredGallery(row.images, prev.images),
  }
}

function sameStringArray(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  return left.every((v, i) => v === right[i])
}

function applyStoredCategoryMedia(
  row: CategoryRow,
  prev: { image: string }
): CategoryRow {
  return {
    ...row,
    image: preserveStoredMedia(row.image, prev.image),
  }
}

function categoryContentEqual(
  prev: {
    slug: string
    titleAr: string
    titleEn: string
    descriptionAr: string
    descriptionEn: string
    image: string
    enabled: boolean
    sortOrder: number
  },
  next: CategoryRow
): boolean {
  return (
    prev.slug === next.slug &&
    prev.titleAr === next.titleAr &&
    prev.titleEn === next.titleEn &&
    prev.descriptionAr === next.descriptionAr &&
    prev.descriptionEn === next.descriptionEn &&
    prev.image === next.image &&
    prev.enabled === next.enabled &&
    prev.sortOrder === next.sortOrder
  )
}

function productContentEqual(
  prev: {
    titleAr: string
    titleEn: string
    descriptionAr: string
    descriptionEn: string
    category: string
    categoryId: string | null
    displayNumber: number
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
  },
  next: ProductRow
): boolean {
  return (
    prev.titleAr === next.titleAr &&
    prev.titleEn === next.titleEn &&
    prev.descriptionAr === next.descriptionAr &&
    prev.descriptionEn === next.descriptionEn &&
    prev.category === next.category &&
    (prev.categoryId ?? null) === (next.categoryId ?? null) &&
    prev.displayNumber === next.displayNumber &&
    prev.image === next.image &&
    sameStringArray(prev.images, next.images) &&
    prev.materialsAr === next.materialsAr &&
    prev.materialsEn === next.materialsEn &&
    prev.dimensionsAr === next.dimensionsAr &&
    prev.dimensionsEn === next.dimensionsEn &&
    prev.featured === next.featured &&
    prev.published === next.published &&
    sameStringArray(prev.colors, next.colors) &&
    prev.sortOrder === next.sortOrder
  )
}

function managerContentEqual(
  prev: {
    nameAr: string
    nameEn: string
    roleAr: string
    roleEn: string
    phone: string
    whatsapp: string | null
    sortOrder: number
  },
  next: ManagerRow
): boolean {
  return (
    prev.nameAr === next.nameAr &&
    prev.nameEn === next.nameEn &&
    prev.roleAr === next.roleAr &&
    prev.roleEn === next.roleEn &&
    prev.phone === next.phone &&
    (prev.whatsapp ?? null) === (next.whatsapp ?? null) &&
    prev.sortOrder === next.sortOrder
  )
}

export type SyncSiteDataResult = {
  needsReindex: string[]
  changedProducts: number
  changedManagers: number
}

/**
 * Fast differential publish: update config, then only create/update/delete
 * products & managers that actually changed. Preserves image vectors when
 * the image URL is unchanged.
 */
export async function syncSiteDataToDb(
  body: SiteData,
  passwordHash: string
): Promise<SyncSiteDataResult> {
  const categories = (body.categories ?? []).map((c, i) => categoryFromSiteData(c, i))
  const uniqueProducts = dedupeById(body.products)
  const products = uniqueProducts.map((p, i) =>
    productFromSiteData(p, i, body.categories ?? [])
  )
  const managers = dedupeById(body.managers).map((m, i) => managerFromSiteData(m, i))

  const [existingConfig, existingProducts, existingManagers, existingCategories] =
    await Promise.all([
    prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: { slideImages: true },
    }),
    prisma.product.findMany({
      select: {
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
      },
    }),
    prisma.manager.findMany({
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        roleAr: true,
        roleEn: true,
        phone: true,
        whatsapp: true,
        sortOrder: true,
      },
    }),
    prisma.portfolioCategory.findMany({
      select: {
        id: true,
        slug: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        image: true,
        enabled: true,
        sortOrder: true,
      },
    }),
  ])

  const configData = configFromSiteData(body, passwordHash)
  if (existingConfig?.slideImages?.length) {
    configData.slideImages = preserveStoredGallery(
      configData.slideImages,
      existingConfig.slideImages
    )
  }

  const prevProductById = new Map(existingProducts.map((p) => [p.id, p]))
  const prevManagerById = new Map(existingManagers.map((m) => [m.id, m]))
  const prevCategoryById = new Map(existingCategories.map((c) => [c.id, c]))
  const nextProductIds = new Set(products.map((p) => p.id))
  const nextManagerIds = new Set(managers.map((m) => m.id))
  const nextCategoryIds = new Set(categories.map((c) => c.id))

  const categoryIdsToDelete = existingCategories
    .filter((c) => !nextCategoryIds.has(c.id))
    .map((c) => c.id)
  const productIdsToDelete = existingProducts
    .filter((p) => !nextProductIds.has(p.id))
    .map((p) => p.id)
  const managerIdsToDelete = existingManagers
    .filter((m) => !nextManagerIds.has(m.id))
    .map((m) => m.id)

  const categoriesToCreate: CategoryRow[] = []
  const categoriesToUpdate: CategoryRow[] = []

  for (const c of categories) {
    const prev = prevCategoryById.get(c.id)
    const row = prev ? applyStoredCategoryMedia(c, prev) : c
    if (!prev) {
      categoriesToCreate.push(row)
      continue
    }
    if (categoryContentEqual(prev, row)) continue
    categoriesToUpdate.push(row)
  }

  const productsToCreate: ProductRow[] = []
  const productsToUpdate: ProductRow[] = []
  const needsReindex: string[] = []

  for (const p of products) {
    const prev = prevProductById.get(p.id)
    const row = prev ? applyStoredProductMedia(p, prev) : p
    if (!prev) {
      productsToCreate.push(row)
      if (row.image && !isProxyMediaUrl(row.image)) needsReindex.push(row.id)
      continue
    }
    if (productContentEqual(prev, row)) continue
    productsToUpdate.push(row)
    if (prev.image !== row.image && row.image && !isProxyMediaUrl(row.image)) {
      needsReindex.push(row.id)
    }
  }

  const managersToCreate: ManagerRow[] = []
  const managersToUpdate: ManagerRow[] = []

  for (const m of managers) {
    const prev = prevManagerById.get(m.id)
    if (!prev) {
      managersToCreate.push(m)
      continue
    }
    if (managerContentEqual(prev, m)) continue
    managersToUpdate.push(m)
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.siteConfig.update({
        where: { id: 1 },
        data: {
          ...configData,
          floatLinks: configData.floatLinks as Prisma.InputJsonValue,
          about: configData.about as Prisma.InputJsonValue,
        },
      })

      if (productIdsToDelete.length > 0) {
        await tx.product.deleteMany({ where: { id: { in: productIdsToDelete } } })
      }
      if (categoryIdsToDelete.length > 0) {
        await tx.product.deleteMany({ where: { categoryId: { in: categoryIdsToDelete } } })
        await tx.portfolioCategory.deleteMany({ where: { id: { in: categoryIdsToDelete } } })
      }
      if (managerIdsToDelete.length > 0) {
        await tx.manager.deleteMany({ where: { id: { in: managerIdsToDelete } } })
      }

      if (categoriesToCreate.length > 0) {
        await tx.portfolioCategory.createMany({
          data: dedupeById(categoriesToCreate),
          skipDuplicates: true,
        })
      }
      if (productsToCreate.length > 0) {
        await Promise.all(
          dedupeById(productsToCreate).map((p) =>
            tx.product.upsert({
              where: { id: p.id },
              create: p,
              update: p,
            })
          )
        )
      }
      if (managersToCreate.length > 0) {
        await tx.manager.createMany({
          data: dedupeById(managersToCreate),
          skipDuplicates: true,
        })
      }

      if (categoriesToUpdate.length > 0) {
        await Promise.all(
          categoriesToUpdate.map((c) =>
            tx.portfolioCategory.update({
              where: { id: c.id },
              data: c,
            })
          )
        )
      }

      if (productsToUpdate.length > 0) {
        await Promise.all(
          productsToUpdate.map((p) => {
            const prev = prevProductById.get(p.id)!
            const imageChanged = prev.image !== p.image
            return tx.product.update({
              where: { id: p.id },
              data: imageChanged
                ? {
                    ...p,
                    imageHash: null,
                    imageVector: Prisma.DbNull,
                    indexedAt: null,
                  }
                : p,
            })
          })
        )
      }

      if (managersToUpdate.length > 0) {
        await Promise.all(
          managersToUpdate.map((m) =>
            tx.manager.update({
              where: { id: m.id },
              data: m,
            })
          )
        )
      }
    },
    { timeout: 25_000, maxWait: 8_000 }
  )

  return {
    needsReindex,
    changedProducts:
      productsToCreate.length + productsToUpdate.length + productIdsToDelete.length,
    changedManagers:
      managersToCreate.length + managersToUpdate.length + managerIdsToDelete.length,
  }
}
