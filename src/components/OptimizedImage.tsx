'use client'

import Image from 'next/image'
import { useMemo, type ImgHTMLAttributes } from 'react'
import { autoImageAlt } from '../lib/seo'
import { imageSrcSet, optimizeImageUrl } from '../utils/images'

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet' | 'src'> {
  src: string
  alt: string
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  widths?: number[]
}

function shouldUseNativeImg(src: string) {
  return !src || src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')
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
  const optimized = useMemo(
    () => optimizeImageUrl(src, { width, quality: priority ? 78 : 72 }),
    [src, width, priority]
  )

  const safeAlt = useMemo(() => autoImageAlt(src, alt), [src, alt])
  const aspectHeight = height ?? Math.round(width * 0.75)

  if (shouldUseNativeImg(src)) {
    const srcSet =
      src.startsWith('data:') || src.startsWith('blob:')
        ? undefined
        : imageSrcSet(src, widths, priority ? 78 : 72)
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
      quality={priority ? 78 : 72}
    />
  )
}
