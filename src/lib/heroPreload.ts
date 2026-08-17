import { absoluteUrl } from '@/lib/seo'
import { optimizeImageUrl } from '@/utils/images'

/** Preload URL for the homepage hero LCP image only. */
export function heroPreloadHref(src: string): string {
  const resolved = src.startsWith('http') ? src : absoluteUrl(src)
  return optimizeImageUrl(resolved, { width: 900, quality: 78 })
}

export function shouldPreloadHeroImage(src: string | undefined): src is string {
  if (!src?.trim()) return false
  if (src.startsWith('data:') || src.startsWith('blob:')) return false
  return true
}
