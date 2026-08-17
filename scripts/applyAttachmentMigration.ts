/**
 * Add product attachment columns (idempotent).
 * Usage: npm run db:apply-attachments
 */
import '../server/loadEnv.js'
import { prisma } from '../server/db'

const STATEMENTS = [
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attachmentData" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "attachmentSize" INTEGER NOT NULL DEFAULT 0`,
]

async function main() {
  for (const sql of STATEMENTS) {
    await prisma.$executeRawUnsafe(sql)
    console.log('OK:', sql.slice(0, 72).replace(/\s+/g, ' '))
  }
  console.log('Done — attachment columns ready.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
