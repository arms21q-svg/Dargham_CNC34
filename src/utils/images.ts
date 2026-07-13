/** Optimize remote image URLs (Unsplash → WebP + responsive sizes). */

export interface ImageOpts {
  width?: number
  height?: number
  quality?: number
}

export function optimizeImageUrl(url: string, opts: ImageOpts = {}): string {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url

  try {
    const u = new URL(url)
    const host = u.hostname
    const isUnsplash = host.includes('unsplash.com') || host.includes('imgix.net')

    if (isUnsplash) {
      u.searchParams.set('auto', 'format')
      u.searchParams.set('fit', 'crop')
      u.searchParams.set('fm', 'webp')
      u.searchParams.set('q', String(opts.quality ?? 72))
      u.searchParams.set('w', String(opts.width ?? 800))
      if (opts.height) u.searchParams.set('h', String(opts.height))
      return u.toString()
    }
  } catch {
    // ignore invalid URLs
  }

  return url
}

export function imageSrcSet(
  url: string,
  widths: number[] = [400, 640, 800, 1200],
  quality = 72
): string {
  return widths
    .map((w) => `${optimizeImageUrl(url, { width: w, quality })} ${w}w`)
    .join(', ')
}

export function preloadImage(url: string, opts: ImageOpts = {}) {
  if (typeof document === 'undefined' || !url) return
  const href = optimizeImageUrl(url, opts)
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = href
  link.setAttribute('fetchpriority', 'high')
  document.head.appendChild(link)
}
