import { useMemo, type ImgHTMLAttributes } from 'react'
import { imageSrcSet, optimizeImageUrl } from '../utils/images'

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> {
  src: string
  alt: string
  width?: number
  heights?: number
  sizes?: string
  priority?: boolean
  widths?: number[]
}

/**
 * Performance-focused image: WebP (via Unsplash), srcset, lazy/eager, decoding.
 * Vite/React equivalent of next/image essentials.
 */
export default function OptimizedImage({
  src,
  alt,
  width = 800,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  widths = [400, 640, 800, 1200],
  className,
  ...rest
}: OptimizedImageProps) {
  const optimized = useMemo(
    () => optimizeImageUrl(src, { width, quality: priority ? 78 : 72 }),
    [src, width, priority]
  )

  const srcSet = useMemo(() => imageSrcSet(src, widths, priority ? 78 : 72), [src, widths, priority])

  return (
    <img
      src={optimized}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'low'}
      {...rest}
    />
  )
}
