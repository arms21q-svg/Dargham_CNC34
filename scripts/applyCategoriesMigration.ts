/**
 * Apply categories migration (safe, idempotent — keeps embedding column).
 * Usage: npm run db:apply-categories
 */
import '../server/loadEnv.js'
import { prisma } from '../server/db'

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "PortfolioCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PortfolioCategory_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "PortfolioCategory_slug_key" ON "PortfolioCategory"("slug")`,
  `CREATE INDEX IF NOT EXISTS "PortfolioCategory_enabled_sortOrder_idx" ON "PortfolioCategory"("enabled", "sortOrder")`,
  `CREATE INDEX IF NOT EXISTS "PortfolioCategory_sortOrder_idx" ON "PortfolioCategory"("sortOrder")`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "categoryId" TEXT`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "displayNumber" INTEGER NOT NULL DEFAULT 0`,
  `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_categoryId_fkey') THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "PortfolioCategory"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$`,
  `CREATE INDEX IF NOT EXISTS "Product_categoryId_displayNumber_idx" ON "Product"("categoryId", "displayNumber")`,
  `CREATE INDEX IF NOT EXISTS "Product_categoryId_sortOrder_idx" ON "Product"("categoryId", "sortOrder")`,
]

async function main() {
  console.log('Applying PortfolioCategory schema …')
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql)
  }

  const { categoryFromSiteData } = await import('../server/mappers')
  const { createDefaultCategories } = await import('../src/data/defaultCategories')

  const count = await prisma.portfolioCategory.count()
  if (count === 0) {
    const defaults = createDefaultCategories()
    await prisma.portfolioCategory.createMany({
      data: defaults.map((c, i) => categoryFromSiteData(c, i)),
    })
    console.log(`Seeded ${defaults.length} default categories`)
  } else {
    console.log(`PortfolioCategory already has ${count} rows`)
  }

  console.log('Done. Run: npm run db:migrate-categories  (backfill product numbers)')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
