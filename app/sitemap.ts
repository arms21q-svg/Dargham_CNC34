import type { MetadataRoute } from 'next'

const siteUrl = 'https://www.dhirghamcnc.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/works', '/works/all', '/about', '/faq', '/contact', '/saved']

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' || route === '/works' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/works' ? 0.9 : 0.7,
  }))
}
