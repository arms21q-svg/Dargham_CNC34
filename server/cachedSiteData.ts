import { unstable_cache } from 'next/cache'
import { prisma } from './db'
import type { SiteData } from '@/types/siteData'

async function fetchSiteDataRaw(): Promise<SiteData | null> {
  const [config, products, managers, categories] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { id: 1 } }),
    prisma.product.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.manager.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.portfolioCategory.findMany({ orderBy: { sortOrder: 'asc' } }),
  ])
  if (!config) return null
  const { toSiteData } = await import('./mappers')
  return toSiteData(config, products, managers, categories)
}

/** Bypass unstable_cache — read directly from DB (e.g. right after publish). */
export async function fetchSiteDataFresh(): Promise<SiteData | null> {
  return fetchSiteDataRaw()
}

/** Cross-request cache — invalidated via revalidateTag('site-data') on admin publish. */
export async function getCachedSiteData(): Promise<SiteData | null> {
  if (process.env.NEXT_PHASE === 'phase-production-build') return null

  try {
    return await unstable_cache(fetchSiteDataRaw, ['site-data-v2'], {
      revalidate: false,
      tags: ['site-data'],
    })()
  } catch {
    return fetchSiteDataRaw()
  }
}
