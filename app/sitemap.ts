import type { MetadataRoute } from 'next'
import { PUBLIC_PAGES } from '@/data/publicPages'
import { prisma } from '@server/db'

const siteUrl = 'https://www.dhirghamcnc.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_PAGES.map((page) => ({
    url: `${siteUrl}${page.path === '/' ? '' : page.path}`,
    lastModified: new Date(),
    changeFrequency: page.path === '/' || page.path === '/works' ? 'weekly' : 'monthly',
    priority: page.path === '/' ? 1 : page.path.startsWith('/works') ? 0.9 : 0.7,
  }))

  let productRoutes: MetadataRoute.Sitemap = []
  try {
    const products = await prisma.product.findMany({
      select: { id: true, updatedAt: true },
      orderBy: { sortOrder: 'asc' },
    })
    productRoutes = products.map((p) => ({
      url: `${siteUrl}/works/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // DB unavailable at build — keep static pages only
  }

  return [...staticRoutes, ...productRoutes]
}
