const MAX_INLINE_CHARS = 512

export function isHeavyDataUrl(url: string | undefined): boolean {
  return Boolean(url?.startsWith('data:') && url.length > MAX_INLINE_CHARS)
}

export function productImageUrl(productId: string, index = 0): string {
  return index <= 0
    ? `/api/products/${encodeURIComponent(productId)}/image`
    : `/api/products/${encodeURIComponent(productId)}/image?i=${index}`
}

export function slideImageUrl(index: number): string {
  return `/api/site/slides/${index}/image`
}

export function categoryImageUrl(categoryId: string): string {
  return `/api/categories/${encodeURIComponent(categoryId)}/image`
}

export function productAttachmentUrl(productId: string): string {
  return `/api/products/${encodeURIComponent(productId)}/attachment`
}

/** Replace embedded base64 with lightweight proxy URLs for public pages. */
export function toPublicMediaUrl(
  ownerId: string,
  url: string | undefined,
  index = 0,
  kind: 'product' | 'slide' | 'category' = 'product'
): string {
  if (!url) return ''
  if (isProxyMediaUrl(url)) return ''
  if (isHeavyDataUrl(url)) {
    if (kind === 'slide') return slideImageUrl(index)
    if (kind === 'category') return categoryImageUrl(ownerId)
    return productImageUrl(ownerId, index)
  }
  return url
}

/** Public /api/.../image paths — not storable or serveable without real pixels in DB. */
export function isProxyMediaUrl(url: string | undefined): boolean {
  if (!url) return false
  return (
    url.startsWith('/api/products/') ||
    url.startsWith('/api/site/slides/') ||
    url.startsWith('/api/categories/')
  )
}

export function isAttachmentProxyUrl(url: string | undefined): boolean {
  return Boolean(url?.includes('/attachment'))
}

export function isServeableMediaUrl(url: string | undefined): boolean {
  if (!url || isProxyMediaUrl(url)) return false
  return (
    url.startsWith('data:') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  )
}

export function toPublicProductImage(productId: string, url: string, index = 0): string {
  if (!url) return ''
  if (isProxyMediaUrl(url)) return productImageUrl(productId, index)
  if (isHeavyDataUrl(url)) return productImageUrl(productId, index)
  return url
}
