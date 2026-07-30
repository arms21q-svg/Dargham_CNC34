import { apiUrl } from './apiBase'

/** Public thumbnail endpoint — reads pixels from DB (same as product detail page). */
export function productImageProxyUrl(productId: string, index = 0): string {
  const path =
    index <= 0
      ? `/api/products/${encodeURIComponent(productId)}/image`
      : `/api/products/${encodeURIComponent(productId)}/image?i=${index}`
  return apiUrl(path)
}

function isUsableCardImage(url: string | undefined): url is string {
  return Boolean(url?.trim())
}

/** Resolve card/thumbnail src — never leave catalog tiles without an image URL to try. */
export function productCardImageSrc(product: {
  id: string
  image?: string
  images?: string[]
}): string {
  if (isUsableCardImage(product.image)) return product.image.trim()
  const fromGallery = product.images?.find((url) => isUsableCardImage(url))?.trim()
  if (fromGallery) return fromGallery
  return productImageProxyUrl(product.id)
}
