import { Prisma } from '@prisma/client'

/** True when Postgres/Supabase is unreachable (local dev offline, network, paused project). */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001') {
    return true
  }
  const msg = error instanceof Error ? error.message : String(error)
  return /Can't reach database server/i.test(msg) || /\bP1001\b/.test(msg)
}
