'use client'

import Image from 'next/image'
import { useMemo, type ImgHTMLAttributes } from 'react'
import { autoImageAlt } from '../lib/seo'
import { apiUrl } from '../utils/apiBase'
import { isRemoteHttpUrl } from '../utils/images'

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
  return !src || src.startsWith('data:') || src.startsWith('blob:')
}

/**
 * Uses next/image with a custom loader for URLs; native img only for data/blob uploads.
 */
export default function OptimizedImage({
  src,
  alt,
  width = 800,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  className,
  ...rest
}: OptimizedImageProps) {
  const resolvedSrc = useMemo(() => resolveImageSrc(src), [src])
  const safeAlt = useMemo(() => autoImageAlt(resolvedSrc, alt), [resolvedSrc, alt])
  const aspectHeight = height ?? Math.round(width * 0.75)

  if (shouldUseNativeImg(resolvedSrc)) {
    return (
      <img
        src={resolvedSrc}
        alt={safeAlt}
        className={className}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
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
      src={resolvedSrc}
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
