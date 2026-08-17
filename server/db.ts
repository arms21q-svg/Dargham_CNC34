import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
const prismaLog =
  process.env.PRISMA_LOG === '1'
    ? (['query', 'error', 'warn'] as const)
    : isBuildPhase
      ? ([] as const)
      : ([] as const)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [...prismaLog],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
