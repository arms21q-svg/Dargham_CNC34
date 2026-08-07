'use client'

import Image from 'next/image'
import { useMemo, type ImgHTMLAttributes } from 'react'
import { autoImageAlt } from '../lib/seo'
import { apiUrl } from '../utils/apiBase'
import { imageSrcSet, isRemoteHttpUrl, optimizeImageUrl } from '../utils/images'

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet' | 'src'> {
  src: string
  alt: string
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  widths?: number[]
}

function resolveImageSrc(src: string): string {
  if (src.startsWith('/api/')) return apiUrl(src)
  return src
}

function shouldUseNativeImg(src: string) {
  if (!src) return true
  if (src.startsWith('data:') || src.startsWith('blob:')) return true
  if (src.startsWith('/')) return true
  if (src.includes('/api/products/') || src.includes('/api/site/slides/')) return true
  // User-provided image URLs can be any host — next/image remotePatterns block most of them.
  if (isRemoteHttpUrl(src)) return true
  return false
}

/**
 * Uses next/image for remote http(s) when possible; keeps native img for data/blob/local
 * to preserve existing admin upload and Unsplash URL behavior without layout changes.
 */
export default function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  widths = [400, 640, 800, 1200],
  className,
  ...rest
}: OptimizedImageProps) {
  const resolvedSrc = useMemo(() => resolveImageSrc(src), [src])
  const optimized = useMemo(
    () => optimizeImageUrl(resolvedSrc, { width, quality: priority ? 78 : 65 }),
    [resolvedSrc, width, priority]
  )

  const safeAlt = useMemo(() => autoImageAlt(resolvedSrc, alt), [resolvedSrc, alt])
  const aspectHeight = height ?? Math.round(width * 0.75)

  if (shouldUseNativeImg(resolvedSrc)) {
    const srcSet =
      resolvedSrc.startsWith('data:') || resolvedSrc.startsWith('blob:')
        ? undefined
        : imageSrcSet(resolvedSrc, widths, priority ? 78 : 65)
    return (
      <img
        src={optimized}
        srcSet={srcSet}
        sizes={sizes}
        alt={safeAlt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'async' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy={isRemoteHttpUrl(resolvedSrc) ? 'no-referrer' : undefined}
        width={width}
        height={aspectHeight}
        {...rest}
      />
    )
  }

  return (
    <Image
      src={optimized}
      alt={safeAlt}
      width={width}
      height={aspectHeight}
      sizes={sizes}
      priority={priority}
      className={className}
      quality={priority ? 78 : 65}
    />
  )
}
