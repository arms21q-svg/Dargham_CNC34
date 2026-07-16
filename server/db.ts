import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Silence noisy connection errors during `next build` SSG
    log: isBuildPhase ? [] : process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
