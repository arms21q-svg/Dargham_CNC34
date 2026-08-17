import { Prisma } from '@prisma/client'
import { prisma } from './db'

let attachmentColumnsCached: boolean | null = null

/** True when Product.attachment* columns are missing (migration not applied yet). */
export function isMissingAttachmentSchema(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2022') {
      const metaStr = JSON.stringify(error.meta ?? {})
      return /attachment(Data|Name|Mime|Size)/i.test(metaStr)
    }
  }
  const msg = error instanceof Error ? error.message : String(error)
  return /attachment(Data|Name|Mime|Size)/i.test(msg) && /does not exist/i.test(msg)
}

/** Cached probe — once true, skip re-checks for this instance. */
export async function attachmentColumnsExist(): Promise<boolean> {
  if (attachmentColumnsCached === true) return true
  try {
    await prisma.$queryRaw`SELECT "attachmentName" FROM "Product" LIMIT 1`
    attachmentColumnsCached = true
    return true
  } catch (error) {
    if (isMissingAttachmentSchema(error)) {
      console.warn(
        '[schema] Product attachment columns missing — run: npm run db:apply-attachments'
      )
      return false
    }
    throw error
  }
}

export function resetAttachmentSchemaCache(): void {
  attachmentColumnsCached = null
}
