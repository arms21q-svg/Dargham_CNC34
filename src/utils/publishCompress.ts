import type { SiteData, Product, PortfolioCategory } from '../types/siteData'
import { compressDataUrlForPublish } from './imageFile'
import { countEmbeddedImages, estimateSiteDataSize, MAX_PUBLISH_CHARS } from './siteDataStorage'

/** Headroom for JSON fields other than base64 blobs. */
const JSON_OVERHEAD_CHARS = 280_000
/** Target per embedded image when auto-shrinking before publish. */
const MIN_IMAGE_CHARS = 18_000
const MAX_IMAGE_CHARS = 72_000

function isDataUrl(url: string | undefined): url is string {
  return Boolean(url?.startsWith('data:'))
}

/** Drop duplicate gallery entries — primary lives in `image` only. */
function slimProductImages(product: Product): Product {
  const image = product.image?.trim() ?? ''
  const gallery = (product.images ?? []).filter(Boolean)
  const extra = [...new Set(gallery)].filter((u) => u !== image)
  return {
    ...product,
    image,
    images: extra.length > 0 ? extra : undefined,
  }
}

async function compressField(
  url: string | undefined,
  maxChars: number,
  cache: Map<string, string>
): Promise<string | undefined> {
  if (!url?.trim()) return url
  if (!isDataUrl(url)) return url
  const cached = cache.get(url)
  if (cached) return cached
  const out =
    url.length <= maxChars ? url : await compressDataUrlForPublish(url, maxChars)
  cache.set(url, out)
  return out
}

async function compressProduct(
  product: Product,
  maxChars: number,
  cache: Map<string, string>
): Promise<Product> {
  const slim = slimProductImages(product)
  const image = (await compressField(slim.image, maxChars, cache)) ?? ''
  const images = slim.images
    ? await Promise.all(slim.images.map((u) => compressField(u, maxChars, cache)))
    : undefined
  return {
    ...slim,
    image,
    images: images?.filter((u): u is string => Boolean(u)),
  }
}

async function compressCategory(
  category: PortfolioCategory,
  maxChars: number,
  cache: Map<string, string>
): Promise<PortfolioCategory> {
  if (!isDataUrl(category.image)) return category
  const image = (await compressField(category.image, maxChars, cache)) ?? category.image
  return { ...category, image }
}

/**
 * Shrink embedded base64 before PUT /api/site-data so large catalogs (40+ works) fit Vercel limits.
 */
export async function prepareSiteDataForPublish(data: SiteData): Promise<SiteData> {
  const embedded = countEmbeddedImages(data)
  if (embedded === 0) return data

  const budget = MAX_PUBLISH_CHARS - JSON_OVERHEAD_CHARS
  const perImage = Math.min(
    MAX_IMAGE_CHARS,
    Math.max(MIN_IMAGE_CHARS, Math.floor(budget / Math.max(1, embedded)))
  )

  const cache = new Map<string, string>()

  const next: SiteData = {
    ...data,
    home: { ...data.home },
    about: { ...data.about },
    products: [...(data.products ?? [])],
    categories: [...(data.categories ?? [])],
  }

  if (next.home.slideImages?.length) {
    next.home.slideImages = await Promise.all(
      next.home.slideImages.map((u) => compressField(u, perImage, cache))
    ).then((arr) => arr.filter((u): u is string => Boolean(u)))
  }

  if (isDataUrl(next.about?.image)) {
    next.about = {
      ...next.about,
      image: (await compressField(next.about.image, perImage, cache)) ?? next.about.image,
    }
  }

  next.categories = await Promise.all(
    (next.categories ?? []).map((c) => compressCategory(c, perImage, cache))
  )

  next.products = await Promise.all(
    (next.products ?? []).map((p) => compressProduct(p, perImage, cache))
  )

  return next
}

export function needsPublishCompression(data: SiteData): boolean {
  return estimateSiteDataSize(data) > MAX_PUBLISH_CHARS - 50_000
}
