/** Optimize remote image URLs (Unsplash / Supabase → smaller formats). */

export interface ImageOpts {
  width?: number
  height?: number
  quality?: number
}

function optimizeSupabaseUrl(url: URL, opts: ImageOpts): string | null {
  // object/public/... → render/image/public/...?width=&quality=
  const marker = '/storage/v1/object/public/'
  const path = url.pathname
  const idx = path.indexOf(marker)
  if (idx === -1) return null

  const objectPath = path.slice(idx + marker.length)
  if (!objectPath) return null

  const render = new URL(url.origin)
  render.pathname = `/storage/v1/render/image/public/${objectPath}`
  render.searchParams.set('width', String(opts.width ?? 800))
  render.searchParams.set('quality', String(opts.quality ?? 72))
  render.searchParams.set('resize', 'contain')
  if (opts.height) render.searchParams.set('height', String(opts.height))
  return render.toString()
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

    if (host.includes('supabase.co')) {
      const transformed = optimizeSupabaseUrl(u, opts)
      if (transformed) return transformed
    }
  } catch {
    // ignore invalid URLs
  }

  return url
}

/** List / card thumbnails — smaller than detail hero. */
export function thumbnailUrl(url: string, width = 400, quality = 65): string {
  return optimizeImageUrl(url, { width, quality })
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
