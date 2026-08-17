/**
 * Backfill Product.categoryId + displayNumber after db:apply-categories.
 * Usage: npm run db:migrate-categories
 */
import '../server/loadEnv.js'
import { prisma } from '../server/db'
import { LEGACY_CATEGORY_SLUG } from '../src/data/defaultCategories'
import { createDefaultCategories } from '../src/data/defaultCategories'
import { categoryFromSiteData } from '../server/mappers'

async function seedCategoriesIfEmpty() {
  const count = await prisma.portfolioCategory.count()
  if (count > 0) {
    console.log(`PortfolioCategory already has ${count} rows — skipping seed`)
    return
  }

  const defaults = createDefaultCategories()
  await prisma.portfolioCategory.createMany({
    data: defaults.map((c, i) => categoryFromSiteData(c, i)),
  })
  console.log(`Created ${defaults.length} default categories`)
}

async function backfillProductCategories() {
  const categories = await prisma.portfolioCategory.findMany({ orderBy: { sortOrder: 'asc' } })
  if (categories.length === 0) {
    console.warn('No categories found — run: npm run db:apply-categories')
    return
  }

  const slugToId = new Map(categories.map((c) => [c.slug, c.id]))
  const defaultCategoryId = categories[0]?.id ?? null
  const counters = new Map<string, number>()

  const existingNumbered = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { categoryId: { not: null }, displayNumber: { gt: 0 } },
    _max: { displayNumber: true },
  })
  for (const row of existingNumbered) {
    if (row.categoryId) counters.set(row.categoryId, row._max.displayNumber ?? 0)
  }

  const products = await prisma.product.findMany({
    select: { id: true, category: true, categoryId: true, displayNumber: true },
    orderBy: { sortOrder: 'asc' },
  })

  let updated = 0
  for (const product of products) {
    let categoryId = product.categoryId
    if (!categoryId) {
      const slug = LEGACY_CATEGORY_SLUG[product.category] ?? 'decor'
      categoryId = slugToId.get(slug) ?? defaultCategoryId
    }
    if (!categoryId) continue

    let displayNumber = product.displayNumber
    if (!displayNumber || displayNumber <= 0) {
      const next = (counters.get(categoryId) ?? 0) + 1
      counters.set(categoryId, next)
      displayNumber = next
    }

    if (categoryId !== product.categoryId || displayNumber !== product.displayNumber) {
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId, displayNumber },
      })
      updated += 1
    }
  }

  console.log(`Backfilled ${updated} products with categoryId/displayNumber`)
}

async function main() {
  await seedCategoriesIfEmpty()
  await backfillProductCategories()
  console.log('Categories backfill complete.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
