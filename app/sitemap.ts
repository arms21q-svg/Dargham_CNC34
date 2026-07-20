import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { prisma } from '@server/db'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${SITE_URL}/works`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/works/all`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.85,
    },
  ]

  let productRoutes: MetadataRoute.Sitemap = []
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    try {
      const products = await prisma.product.findMany({
        where: { published: true },
        select: { id: true, updatedAt: true },
        orderBy: [{ featured: 'desc' }, { sortOrder: 'asc' }],
      })
      productRoutes = products.map((p) => ({
        url: `${SITE_URL}/works/${p.id}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    } catch {
      // Runtime DB unavailable — keep static routes only
    }
  }

  return [...staticRoutes, ...productRoutes]
}
