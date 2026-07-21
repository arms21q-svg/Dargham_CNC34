import { Prisma } from '@prisma/client'
import { prisma } from './db'
import {
  configFromSiteData,
  managerFromSiteData,
  productFromSiteData,
} from './mappers'
import type { SiteData } from '../src/types/siteData'

type ProductRow = ReturnType<typeof productFromSiteData>
type ManagerRow = ReturnType<typeof managerFromSiteData>

function sameStringArray(a: string[] | undefined, b: string[] | undefined): boolean {
  const left = a ?? []
  const right = b ?? []
  if (left.length !== right.length) return false
  return left.every((v, i) => v === right[i])
}

function productContentEqual(
  prev: {
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
  },
  next: ProductRow
): boolean {
  return (
    prev.titleAr === next.titleAr &&
    prev.titleEn === next.titleEn &&
    prev.descriptionAr === next.descriptionAr &&
    prev.descriptionEn === next.descriptionEn &&
    prev.category === next.category &&
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
  const configData = configFromSiteData(body, passwordHash)
  const products = body.products.map((p, i) => productFromSiteData(p, i))
  const managers = body.managers.map((m, i) => managerFromSiteData(m, i))

  const [existingProducts, existingManagers] = await Promise.all([
    prisma.product.findMany({
      select: {
        id: true,
        titleAr: true,
        titleEn: true,
        descriptionAr: true,
        descriptionEn: true,
        category: true,
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
  ])

  const prevProductById = new Map(existingProducts.map((p) => [p.id, p]))
  const prevManagerById = new Map(existingManagers.map((m) => [m.id, m]))
  const nextProductIds = new Set(products.map((p) => p.id))
  const nextManagerIds = new Set(managers.map((m) => m.id))

  const productIdsToDelete = existingProducts
    .filter((p) => !nextProductIds.has(p.id))
    .map((p) => p.id)
  const managerIdsToDelete = existingManagers
    .filter((m) => !nextManagerIds.has(m.id))
    .map((m) => m.id)

  const productsToCreate: ProductRow[] = []
  const productsToUpdate: ProductRow[] = []
  const needsReindex: string[] = []

  for (const p of products) {
    const prev = prevProductById.get(p.id)
    if (!prev) {
      productsToCreate.push(p)
      if (p.image) needsReindex.push(p.id)
      continue
    }
    if (productContentEqual(prev, p)) continue
    productsToUpdate.push(p)
    if (prev.image !== p.image && p.image) needsReindex.push(p.id)
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
      if (managerIdsToDelete.length > 0) {
        await tx.manager.deleteMany({ where: { id: { in: managerIdsToDelete } } })
      }

      if (productsToCreate.length > 0) {
        await tx.product.createMany({ data: productsToCreate })
      }
      if (managersToCreate.length > 0) {
        await tx.manager.createMany({ data: managersToCreate })
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
