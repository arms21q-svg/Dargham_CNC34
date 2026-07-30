import type { Product, SiteData } from '../types/siteData'
import { slideImages as DEFAULT_SLIDE_IMAGES } from '../data/content'

const MAX_INLINE_CHARS = 512

function isProxyMediaUrl(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith('/api/products/') || url.startsWith('/api/site/slides/')
}

function isHeavyDataUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('data:') && url.length > MAX_INLINE_CHARS)
}

function productImageUrl(productId: string, index = 0): string {
  return index <= 0
    ? `/api/products/${encodeURIComponent(productId)}/image`
    : `/api/products/${encodeURIComponent(productId)}/image?i=${index}`
}

function slideImageUrl(index: number): string {
  return `/api/site/slides/${index}/image`
}

function defaultSlideUrl(index: number): string {
  return DEFAULT_SLIDE_IMAGES[index] ?? DEFAULT_SLIDE_IMAGES[0] ?? ''
}

function resolveSlideImage(url: string | undefined, index: number): string {
  if (!url) return defaultSlideUrl(index)
  if (isProxyMediaUrl(url)) return defaultSlideUrl(index)
  if (isHeavyDataUrl(url)) return slideImageUrl(index)
  return url
}

function resolveProductImage(product: Product, url: string | undefined, index: number): string {
  const gallery = product.images ?? []
  const candidates =
    index <= 0
      ? [url, product.image, ...gallery]
      : [gallery[index], url, product.image, ...gallery]

  for (const candidate of candidates) {
    if (!candidate || isProxyMediaUrl(candidate)) continue
    if (isHeavyDataUrl(candidate)) return productImageUrl(product.id, index)
    return candidate
  }
  return ''
}

function stripProxyFromProduct(product: Product): Product {
  const image = isProxyMediaUrl(product.image) ? '' : product.image
  const images = (product.images ?? []).filter((url) => url && !isProxyMediaUrl(url))
  return { ...product, image, images }
}

/** Drop embedded base64 from public payloads — serve via /api/.../image instead. */
export function lightPublicSiteData(data: SiteData): SiteData {
  const slides = (data.home?.slideImages ?? []).map((url, index) => resolveSlideImage(url, index)).filter(Boolean)

  const products: Product[] = (data.products ?? []).map((p) => {
    const gallery = (p.images ?? []).filter(Boolean)
    const primarySource = p.image || gallery[0] || ''
    const primary = resolveProductImage(p, primarySource, 0)
    const images = gallery.map((url, index) => resolveProductImage(p, url, index))

    return stripProxyFromProduct({
      ...p,
      image: primary,
      images: images.filter(Boolean),
    })
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
