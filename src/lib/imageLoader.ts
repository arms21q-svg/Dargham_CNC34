import { optimizeImageUrl } from '@/utils/images'

/** Custom next/image loader — resize remote URLs; pass through data/blob and /api paths. */
export default function imageLoader({
  src,
  width,
  quality,
}: {
  src: string
  width: number
  quality?: number
}) {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src
  return optimizeImageUrl(src, { width, quality: quality ?? 72 })
}
