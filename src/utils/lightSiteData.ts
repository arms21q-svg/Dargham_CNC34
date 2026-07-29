import type { Product, SiteData } from '../types/siteData'
import { slideImages as DEFAULT_SLIDE_IMAGES } from '../data/content'

const MAX_INLINE_CHARS = 512

function isHeavyDataUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('data:') && url.length > MAX_INLINE_CHARS)
}

function firstHttpUrl(...candidates: (string | undefined)[]): string {
  for (const url of candidates) {
    if (url && !url.startsWith('data:') && !url.startsWith('blob:')) return url
  }
  return ''
}

function productImageUrl(productId: string, index = 0): string {
  return index <= 0
    ? `/api/products/${encodeURIComponent(productId)}/image`
    : `/api/products/${encodeURIComponent(productId)}/image?i=${index}`
}

function slideImageUrl(index: number): string {
  return `/api/site/slides/${index}/image`
}

function resolveProductImage(product: Product, url: string | undefined, index: number): string {
  if (!url) return firstHttpUrl(product.image, ...(product.images ?? []))
  if (isHeavyDataUrl(url)) return productImageUrl(product.id, index)
  return url
}

/** Drop embedded base64 from public payloads — serve via /api/.../image instead. */
export function lightPublicSiteData(data: SiteData): SiteData {
  const slides = (data.home?.slideImages ?? []).map((url, index) => {
    if (!url) return ''
    if (isHeavyDataUrl(url)) return slideImageUrl(index)
    return url
  }).filter(Boolean)

  const products: Product[] = (data.products ?? []).map((p) => {
    const gallery = (p.images ?? []).filter(Boolean)
    const primarySource = p.image || gallery[0] || ''
    const primary = resolveProductImage(p, primarySource, 0)
    const images = gallery.map((url, index) => resolveProductImage(p, url, index))

    return {
      ...p,
      image: primary || productImageUrl(p.id, 0),
      images: images.filter(Boolean),
    }
  })

  return {
    ...data,
    home: {
      ...data.home,
      slideImages: slides.length > 0 ? slides : [...DEFAULT_SLIDE_IMAGES],
    },
    products,
  }
}

export function stripHeavyEmbeddedMedia(data: SiteData): SiteData {
  return lightPublicSiteData(data)
}
